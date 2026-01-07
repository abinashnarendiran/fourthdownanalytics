const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET; // same secret you used to sign JWT
const COOKIE_NAME = "auth_token";

function authenticate(req, res, next) {
  const token = req.cookies[COOKIE_NAME]; // get JWT from cookie

  if (!token) return res.status(401).json({ message: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET); // verify token
    req.user = decoded; // attach user info to req
    next(); // continue to next middleware or route
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = authenticate;
