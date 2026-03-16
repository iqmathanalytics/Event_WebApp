const bcrypt = require("bcryptjs");
const ApiError = require("../utils/ApiError");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { findUserByEmail, createUser, findUserById } = require("../models/userModel");

async function register(payload) {
  const existing = await findUserByEmail(payload.email);
  if (existing) {
    throw new ApiError(409, "Email already in use");
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const userId = await createUser({
    name: payload.name,
    email: payload.email,
    mobileNumber: payload.mobile_number,
    passwordHash,
    role: "user"
  });

  return { userId };
}

async function login({ email, password, portal }) {
  const user = await findUserByEmail(email);
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (!user.is_active) {
    throw new ApiError(403, "Account is deactivated");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (portal === "user" && user.role !== "user") {
    throw new ApiError(403, "Please use staff login for this account");
  }
  if (portal === "staff" && !["admin", "organizer"].includes(user.role)) {
    throw new ApiError(403, "Please use user login for this account");
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  return {
    accessToken: generateAccessToken(tokenPayload),
    refreshToken: generateRefreshToken(tokenPayload),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile_number: user.mobile_number,
      role: user.role
    }
  };
}

async function refreshAccessToken(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (_err) {
    throw new ApiError(401, "Unauthorized: invalid refresh token");
  }

  const user = await findUserById(decoded.id);
  if (!user) {
    throw new ApiError(401, "Unauthorized: user not found");
  }
  if (!user.is_active) {
    throw new ApiError(403, "Account is deactivated");
  }

  const tokenPayload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  return {
    accessToken: generateAccessToken(tokenPayload),
    refreshToken: generateRefreshToken(tokenPayload),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile_number: user.mobile_number,
      role: user.role
    }
  };
}

module.exports = {
  register,
  login,
  refreshAccessToken
};
