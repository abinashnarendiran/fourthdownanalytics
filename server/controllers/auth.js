const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Users } = require("../models");

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: false,      // true in production (HTTPS)
  sameSite: "lax",
  maxAge: 1000 * 60 * 60 * 24, // 1 day
};

// Signup
module.exports.signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;


    // 1️⃣ Check if the email already exists
    const existingUser = await Users.findOne({ where: { email } });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "Email already in use" }); // return early
    }

    // 2️⃣ Hash password
    const hashedPassword = await bcrypt.hash(password, 10); // or use SALT_ROUNDS

    // 3️⃣ Create user
    const newUser = await Users.create({ name, email, password: hashedPassword });

    // 4️⃣ Send success response
    res.status(201).json({ message: "User created", user: newUser });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Try Again" });
  }
};

// Login
module.exports.login = async (req, res) => {
  const { email, password } = req.body;


  const user = await Users.findOne({ where: { email } });
  if (!user) return res.status(401).json({ message: "Email not found" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ message: "Password incorrect" });


  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: "1d" }
  );

  res.cookie("auth_token", token, COOKIE_OPTIONS);


  res.json({
    user: { id: user.id, name: user.name, email: user.email }
  });
};
// Logout
module.exports.logout = (req, res) => {
  res.clearCookie("auth_token");
  res.json({ message: "Logged out" });
};

module.exports.me = (req, res) => {
  try {
    const token = req.cookies.auth_token;
    if (!token) return res.status(401).json({ message: "Not authenticated" });

    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ user: decoded });
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Refresh
module.exports.refresh = (req, res) => {
  // Implement refresh token logic here
  res.json({ message: "Token refreshed" });
};
