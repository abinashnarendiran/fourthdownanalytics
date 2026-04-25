const router = require("express").Router();
const controller = require("../controllers/sleeper");

// Auth routes
router.get("/getSleeperLeagueStatus/:id", controller.getSleeperLeagueStatus);
router.get(
  "/getSleeperLeagueSeasonTeams/:id",
  controller.getSleeperLeagueSeasonTeams,
);
router.post(
  "/getSleeperPowerRankingsSeasonData",
  controller.getSleeperPowerRankingsSeasonData,
);
router.post(
  "/getSleeperTeamAnalysisSeasonData",
  controller.getSleeperTeamAnalysisSeasonData,
);

module.exports = router;
