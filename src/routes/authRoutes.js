const express = require("express");
const authController = require("../controllers/authController");
const validateRequest = require("../middleware/validateRequest");
const { registerSchema, loginSchema, refreshTokenSchema } = require("../validators/authValidator");

const router = express.Router();

router.post("/register", validateRequest(registerSchema), authController.register);
router.post("/login/user", validateRequest(loginSchema), authController.loginUser);
router.post("/login/staff", validateRequest(loginSchema), authController.loginStaff);
router.post("/refresh-token", validateRequest(refreshTokenSchema), authController.refreshToken);

module.exports = router;
