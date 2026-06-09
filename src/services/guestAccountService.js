const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { findUserByEmail, createUser } = require("../models/userModel");
const {
  alignNewsletterRowsToCanonicalEmail,
  linkNewsletterSubscriberToUser
} = require("../models/newsletterModel");

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

/** Human-readable temporary password for guest welcome email (excludes ambiguous chars). */
function generateTemporaryPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const segments = [];
  for (let s = 0; s < 3; s += 1) {
    let seg = "";
    for (let i = 0; i < 4; i += 1) {
      seg += chars[crypto.randomInt(chars.length)];
    }
    segments.push(seg);
  }
  return segments.join("-");
}

/**
 * Guest checkout: ensure a user row exists so they can access My Hub.
 * New accounts receive a temporary password in a separate welcome email.
 */
async function ensureGuestUserAccount({ name, email, phone }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { userId: null, created: false, email: null, temporaryPassword: null };
  }

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    return {
      userId: existing.id,
      created: false,
      email: normalizedEmail,
      temporaryPassword: null
    };
  }

  const temporaryPassword = generateTemporaryPassword();
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);
  const displayName = String(name || "Guest").trim() || "Guest";
  const userId = await createUser({
    name: displayName,
    email: normalizedEmail,
    mobileNumber: phone || null,
    passwordHash,
    role: "user",
    organizerEnabled: false,
    authProvider: "local"
  });

  await alignNewsletterRowsToCanonicalEmail(normalizedEmail).catch(() => {});
  await linkNewsletterSubscriberToUser(userId, normalizedEmail).catch(() => {});

  return {
    userId,
    created: true,
    email: normalizedEmail,
    temporaryPassword
  };
}

module.exports = {
  ensureGuestUserAccount,
  generateTemporaryPassword
};
