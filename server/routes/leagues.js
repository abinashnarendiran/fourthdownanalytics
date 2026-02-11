const router = require("express").Router();
const controller = require("../controllers/leagues");

// Auth routes
router.get("/getUserLeagues", controller.getUserLeagues);


module.exports = router;
