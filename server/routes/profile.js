const router = require("express").Router();
const controller = require("../controllers/profile");

router.get("/", controller.getProfile);
router.patch("/", controller.updateProfile);
router.put("/password", controller.changePassword);

module.exports = router;
