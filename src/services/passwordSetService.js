const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const ApiError = require("../utils/ApiError");
const { pool } = require("../config/db");
const { findUserById } = require("../models/userModel");
const {
  createPasswordSetToken,
  findValidPasswordSetToken,
  markPasswordSetTokenUsed
} = require("../models/passwordSetTokenModel");
const { dashboardUrl } = require("../utils/brandEmail");
const authService = require("./authService");

async function issueGuestPasswordSetupLink(userId) {
  const rawToken = await createPasswordSetToken(userId, { expiresHours: 72 });
  return `${dashboardUrl("/set-password")}?token=${encodeURIComponent(rawToken)}`;
}

async function validatePasswordSetupToken(rawToken) {
  const row = await findValidPasswordSetToken(rawToken);
  if (!row) {
    throw new ApiError(400, "This link is invalid or has expired. Request a new booking email or contact support.");
  }
  if (String(row.auth_provider || "").toLowerCase() === "google") {
    throw new ApiError(400, "This account uses Google sign-in. Use Continue with Google on the login page.");
  }
  return {
    email: row.email,
    name: row.name
  };
}

async function completePasswordSetup({ rawToken, password }) {
  const row = await findValidPasswordSetToken(rawToken);
  if (!row) {
    throw new ApiError(400, "This link is invalid or has expired.");
  }
  if (String(row.auth_provider || "").toLowerCase() === "google") {
    throw new ApiError(400, "This account uses Google sign-in.");
  }

  const passwordHash = await bcrypt.hash(String(password), 12);
  await pool.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, row.user_id]);
  await markPasswordSetTokenUsed(row.id);

  const user = await findUserById(row.user_id);
  if (!user) {
    throw new ApiError(404, "Account not found.");
  }

  return authService.tokensForUser(user);
}

module.exports = {
  issueGuestPasswordSetupLink,
  validatePasswordSetupToken,
  completePasswordSetup
};
