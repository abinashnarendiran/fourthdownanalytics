const router = require("express").Router();
const controller = require("../controllers/sleeper");

// Auth routes
router.post("/getSleeperLeagueStatus", controller.getSleeperLeagueStatus);
router.post("/getSleeperSeasonData", controller.getSleeperSeasonData);

module.exports = router;
