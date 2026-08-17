const bcrypt = require("bcryptjs");
const ApiError = require("../utils/ApiError");
const { pool } = require("../config/db");
const { findUserById, findUserByEmail } = require("../models/userModel");
const { findLatestBookingContactByEmail } = require("../models/bookingModel");
const {
  createPasswordSetToken,
  findValidPasswordSetToken,
  markPasswordSetTokenUsed,
  invalidateUnusedPasswordSetTokens
} = require("../models/passwordSetTokenModel");
const { dashboardUrl } = require("../utils/brandEmail");
const { sendTransactionalEmail } = require("../utils/emailIntegrations");
const {
  buildPasswordResetEmail,
  buildGoogleSignInReminderEmail
} = require("../utils/transactionalEmailTemplates");
const { ensureGuestUserAccount } = require("./guestAccountService");
const authService = require("./authService");

function firstNameFromUser(user) {
  const name = String(user?.name || "").trim();
  if (!name) {
    return "there";
  }
  return name.split(/\s+/)[0];
}

function isGoogleOnlyAccount(user) {
  const provider = String(user?.auth_provider || "local").toLowerCase();
  const hasPassword = Boolean(user?.password_hash) || Number(user?.has_password) === 1;
  return provider === "google" && !hasPassword;
}

function isInactive(user) {
  const flag = user?.is_active;
  return flag === 0 || flag === false || flag === "0";
}

async function sendMailOrThrow(mail, to) {
  const result = await sendTransactionalEmail({
    to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  });
  if (!result?.sent) {
    throw new ApiError(
      503,
      result?.skipped
        ? "Email sending is not configured. Try again later."
        : "We couldn't send that email right now. Please try again in a moment."
    );
  }
}

async function issueGuestPasswordSetupLink(userId) {
  const rawToken = await createPasswordSetToken(userId, { expiresHours: 72 });
  return `${dashboardUrl("/set-password")}?token=${encodeURIComponent(rawToken)}`;
}

async function resolveAccountForPasswordReset(email) {
  let user = await findUserByEmail(email);
  if (user) {
    return user;
  }

  const booking = await findLatestBookingContactByEmail(email);
  if (!booking) {
    return null;
  }

  await ensureGuestUserAccount({
    name: booking.name,
    email,
    phone: null
  });
  return findUserByEmail(email);
}

async function requestPasswordReset(email) {
  const normalized = String(email || "")
    .trim()
    .toLowerCase();
  if (!normalized) {
    return { ok: true };
  }

  const user = await resolveAccountForPasswordReset(normalized);
  if (!user || isInactive(user)) {
    return { ok: true };
  }

  const firstName = firstNameFromUser(user);
  if (isGoogleOnlyAccount(user)) {
    const mail = buildGoogleSignInReminderEmail({ firstName, email: normalized });
    await sendMailOrThrow(mail, normalized);
    return { ok: true };
  }

  await invalidateUnusedPasswordSetTokens(user.id);
  const rawToken = await createPasswordSetToken(user.id, { expiresHours: 2 });
  const resetUrl = `${dashboardUrl("/reset-password")}?token=${encodeURIComponent(rawToken)}`;
  const mail = buildPasswordResetEmail({ firstName, email: normalized, resetUrl });
  await sendMailOrThrow(mail, normalized);
  return { ok: true };
}

async function validatePasswordSetupToken(rawToken) {
  const row = await findValidPasswordSetToken(rawToken);
  if (!row) {
    throw new ApiError(400, "This link is invalid or has expired. Request a new reset email from the login page.");
  }
  if (isGoogleOnlyAccount(row)) {
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
  if (isGoogleOnlyAccount(row)) {
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
  requestPasswordReset,
  validatePasswordSetupToken,
  completePasswordSetup
};
