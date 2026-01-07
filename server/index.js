const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const authRoutes = require("./routes/auth");
const sequelize = require("./config/db");
const morgan = require("morgan");
const passport = require("./middleware/passport");


dotenv.config();
const app = express();


app.use(cors({
  origin: "http://localhost:3000",
  credentials: true,
}));

app.use(morgan("dev")); // logs all incoming requests

app.use(express.json());
app.use(cookieParser());

// Routes
app.use("/api/auth", authRoutes);

// Apply authenticate middleware globally
app.use((req, res, next) => {
  const publicPaths = ["/api/auth/login", "/api/auth/signup"];
  if (publicPaths.includes(req.path)) return next(); // skip middleware
  passport.authenticate(req, res, next); // else run auth
});

const PORT = process.env.PORT || 5000;

sequelize.authenticate()
  .then(() => console.log("Database connected"))
  .catch(err => console.error(err));

sequelize.sync();

app.listen(PORT, () =>
  console.log(`Server running on port ${PORT}`)
);
