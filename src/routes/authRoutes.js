const express = require("express");
const authController = require("../controllers/authController");
const validateRequest = require("../middleware/validateRequest");
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  googleUserSchema,
  validateSetPasswordTokenSchema,
  completeSetPasswordSchema
} = require("../validators/authValidator");

const router = express.Router();

router.post("/register", validateRequest(registerSchema), authController.register);
router.post("/login/user", validateRequest(loginSchema), authController.loginUser);
router.post("/login/staff", validateRequest(loginSchema), authController.loginStaff);
router.post("/google/login", validateRequest(googleUserSchema), authController.googleLoginUser);
router.post("/google/register", validateRequest(googleUserSchema), authController.googleRegisterUser);
router.post("/refresh-token", validateRequest(refreshTokenSchema), authController.refreshToken);
router.get(
  "/set-password/validate",
  validateRequest(validateSetPasswordTokenSchema),
  authController.validateSetPasswordToken
);
router.post(
  "/set-password",
  validateRequest(completeSetPasswordSchema),
  authController.completeSetPassword
);

module.exports = router;
