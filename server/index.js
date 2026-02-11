const dotenv = require("dotenv");
const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const morgan = require("morgan");
const sequelize = require("./config/db");

const { authenticate } = require("./middleware/passport");

const routes = require("./routes");

const app = express(); // ← declare app BEFORE using it

// Middleware
app.use(cookieParser());
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(morgan("dev"));
app.use(express.json());

// Protected routes middleware
const publicPaths = ["/api/auth/login", "/api/auth/signup"];
app.use((req, res, next) => {
  if (publicPaths.includes(req.path)) return next();
  authenticate(req, res, next);
});

// Mount all routes under /api
app.use("/api", routes);

// Start all cron jobs
require("./cronjobs");

// Database
sequelize
  .authenticate()
  .then(() => console.log("Database connected"))
  .catch((err) => console.error(err));

sequelize.sync({
  logging: process.env.NODE_ENV === "development" ? console.log : false
});
// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
