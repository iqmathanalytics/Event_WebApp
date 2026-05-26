const asyncHandler = require("../utils/asyncHandler");
const { getValidatedBody } = require("../utils/validatedRequest");
const authService = require("../services/authService");

const register = asyncHandler(async (req, res) => {
  const result = await authService.register(getValidatedBody(req));
  res.status(201).json({
    success: true,
    message: "User registered successfully",
    data: result
  });
});

const loginUser = asyncHandler(async (req, res) => {
  const result = await authService.login({ ...getValidatedBody(req), portal: "user" });
  res.status(200).json({
    success: true,
    message: "User login successful",
    data: result
  });
});

const loginStaff = asyncHandler(async (req, res) => {
  const result = await authService.login({ ...getValidatedBody(req), portal: "staff" });
  res.status(200).json({
    success: true,
    message: "Staff login successful",
    data: result
  });
});

const refreshToken = asyncHandler(async (req, res) => {
  const body = getValidatedBody(req);
  const result = await authService.refreshAccessToken(body.refreshToken);
  res.status(200).json({
    success: true,
    message: "Token refreshed successfully",
    data: result
  });
});

const googleLoginUser = asyncHandler(async (req, res) => {
  const result = await authService.loginWithGoogleIdToken(getValidatedBody(req).idToken);
  res.status(200).json({
    success: true,
    message: "Signed in with Google successfully.",
    data: result
  });
});

const googleRegisterUser = asyncHandler(async (req, res) => {
  const result = await authService.registerWithGoogleIdToken(getValidatedBody(req).idToken);
  res.status(201).json({
    success: true,
    message: "Welcome! Finish setting up your profile to get started.",
    data: result
  });
});

module.exports = {
  register,
  loginUser,
  loginStaff,
  refreshToken,
  googleLoginUser,
  googleRegisterUser
};
