const router = require("express").Router();
const controller = require("../controllers/intergrations");

// Auth routes
router.get("/userPlatforms", controller.getUserPlatforms);
router.post("/sleeper/fetchAccount", controller.fetchSleeperAccount);
router.post("/addLeagues", controller.addLeagues);
router.delete("/deleteLeague/:fantasyDbLeagueId", controller.deleteLeague);
router.delete("/deleteFantasyPlatform/:fantasyPlatformId", controller.deleteFantasyPlatform);
router.post("/resyncPlatform", controller.resyncPlatform);

module.exports = router;
