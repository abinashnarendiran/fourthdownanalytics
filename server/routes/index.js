const express = require("express");
const authRoutes = require("./auth");
const integrationsRoutes = require("./integrations");

const router = express.Router();

// Register sub-routes
router.use("/auth", authRoutes);
router.use("/integrations", integrationsRoutes);

module.exports = router;
