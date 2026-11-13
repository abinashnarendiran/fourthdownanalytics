const express = require("express");
const authRoutes = require("./auth");
const integrationsRoutes = require("./integrations");
const leaguesRoutes = require("./leagues");
const sleeperRoutes = require("./sleeper");
const profileRoutes = require("./profile");

const router = express.Router();

// Register sub-routes
router.use("/auth", authRoutes);
router.use("/integrations", integrationsRoutes);
router.use("/leagues", leaguesRoutes);
router.use("/sleeper", sleeperRoutes);
router.use("/profile", profileRoutes);

module.exports = router;
