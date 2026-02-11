const router = require("express").Router();
const controller = require("../controllers/auth");

// Auth routes
router.post("/signup", controller.signup);
router.post("/login", controller.login);
router.post("/logout", controller.logout);
router.post("/refresh", controller.refresh);
router.get("/me", controller.me);

module.exports = router;
