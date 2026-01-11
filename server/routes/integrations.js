const router = require("express").Router();
const controller = require("../controllers/intergrations");

// Auth routes
router.get("/userPlatforms", controller.getUserPlatforms);
router.post("/sleeper/fetchAccount", controller.fetchSleeperAccount);
router.post("/addLeague", controller.addLeague);

module.exports = router;
