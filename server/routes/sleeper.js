const router = require("express").Router();
const controller = require("../controllers/sleeper");

// Auth routes
router.post("/getSleeperLeagueStatus", controller.getSleeperLeagueStatus);


module.exports = router;
