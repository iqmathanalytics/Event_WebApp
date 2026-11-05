const express = require("express");
const rateLimit = require("express-rate-limit");
const authController = require("../controllers/authController");
const validateRequest = require("../middleware/validateRequest");
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  googleUserSchema,
  validateSetPasswordTokenSchema,
  completeSetPasswordSchema,
  forgotPasswordSchema
} = require("../validators/authValidator");

const router = express.Router();

// Auth limits stay on even if global RATE_LIMIT_DISABLED=true (unless explicitly opted out).
const authLimitsDisabled =
  String(process.env.AUTH_RATE_LIMIT_DISABLED || "").toLowerCase() === "true";

function authLimiter({ windowMs, max, message }) {
  if (authLimitsDisabled) {
    return (_req, _res, next) => next();
  }
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    message: { success: false, message }
  });
}

const loginLimiter = authLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_LOGIN_RATE_LIMIT_MAX) || 20,
  message: "Too many sign-in attempts. Please wait and try again."
});

const registerLimiter = authLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_REGISTER_RATE_LIMIT_MAX) || 10,
  message: "Too many registration attempts. Please wait and try again."
});

const forgotLimiter = authLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_FORGOT_RATE_LIMIT_MAX) || 5,
  message: "Too many password reset requests. Please wait and try again."
});

const refreshLimiter = authLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_REFRESH_RATE_LIMIT_MAX) || 60,
  message: "Too many token refresh attempts. Please wait and try again."
});

const passwordLimiter = authLimiter({
  windowMs: 15 * 60 * 1000,
  max: Number(process.env.AUTH_PASSWORD_RATE_LIMIT_MAX) || 10,
  message: "Too many password update attempts. Please wait and try again."
});

router.post(
  "/register",
  registerLimiter,
  validateRequest(registerSchema),
  authController.register
);
router.post(
  "/login/user",
  loginLimiter,
  validateRequest(loginSchema),
  authController.loginUser
);
router.post(
  "/login/staff",
  loginLimiter,
  validateRequest(loginSchema),
  authController.loginStaff
);
router.post(
  "/google/login",
  loginLimiter,
  validateRequest(googleUserSchema),
  authController.googleLoginUser
);
router.post(
  "/google/register",
  registerLimiter,
  validateRequest(googleUserSchema),
  authController.googleRegisterUser
);
router.post(
  "/refresh-token",
  refreshLimiter,
  validateRequest(refreshTokenSchema),
  authController.refreshToken
);
router.get(
  "/set-password/validate",
  passwordLimiter,
  validateRequest(validateSetPasswordTokenSchema),
  authController.validateSetPasswordToken
);
router.post(
  "/set-password",
  passwordLimiter,
  validateRequest(completeSetPasswordSchema),
  authController.completeSetPassword
);
router.post(
  "/forgot-password",
  forgotLimiter,
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword
);
router.get(
  "/reset-password/validate",
  passwordLimiter,
  validateRequest(validateSetPasswordTokenSchema),
  authController.validateSetPasswordToken
);
router.post(
  "/reset-password",
  passwordLimiter,
  validateRequest(completeSetPasswordSchema),
  authController.completeSetPassword
);

module.exports = router;
