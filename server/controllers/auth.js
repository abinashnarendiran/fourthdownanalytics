const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Users } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret"; // Secret for JWT signing
const COOKIE_OPTIONS = {
  httpOnly: true, // Prevents client-side JavaScript from accessing the cookie
  secure: false, // Set to true in production (HTTPS)
  sameSite: "lax", // CSRF protection
  maxAge: 1000 * 60 * 60 * 24, // Cookie expiration time (1 day)
};

// Signup
module.exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body; // Destructure user data from request body

    // 1️⃣ Check if the email already exists
    const existingUser = await Users.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "Email already in use" }); // Return early if user exists
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

    // 3️⃣ Create user
    const newUser = await Users.create({
      name,
      email,
      password: hashedPassword,
    }); // Save new user to database

    // 4️⃣ Send success response
    // Use a different variable name
    const { password: _, ...userWithoutPassword } = newUser.toJSON();
    return res.status(201).json(userWithoutPassword);
  } catch (err) {
    console.error(err); // Log error
    return res.status(500).json({ message: "Try Again" }); // Respond with error message
  }
};

// Login
module.exports.login = async (req, res) => {
  const { email, password } = req.body; // Destructure user credentials from request body

  // Find user by email
  const user = await Users.findOne({ where: { email } });
  if (!user) return res.status(401).json({ message: "Email not found" }); // Respond if user not found

  // Compare password with hashed password
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Password incorrect" }); // Respond if password does not match

  // Generate JWT token
  const token = jwt.sign(
    { userId: user.userId, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: "1d" }, // Token expiration time (1 day)
  );

  res.cookie("auth_token", token, COOKIE_OPTIONS); // Set cookie with token

  return res.json({ userId: user.userId, name: user.name, email: user.email }); // Respond with user data
};

// Logout
module.exports.logout = (req, res) => {
  res.clearCookie("auth_token"); // Clear the authentication cookie
  res.json({ message: "Logged out" }); // Respond with logout message
};

// Get current user
module.exports.me = (req, res) => {
  try {
    const token = req.cookies.auth_token; // Get token from cookies
    if (!token) return res.status(401).json({ message: "Not authenticated" }); // Respond if no token

    const decoded = jwt.verify(token, JWT_SECRET); // Verify token
    return res.json(decoded); // Respond with decoded token data
  } catch {
    return res.status(401).json({ message: "Invalid token" }); // Respond if token is invalid
  }
};

// Refresh
module.exports.refresh = (req, res) => {
  // Implement refresh token logic here
  res.json({ message: "Token refreshed" }); // Placeholder response for token refresh
};
