const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { findUserByEmail, createUser } = require("../models/userModel");
const {
  alignNewsletterRowsToCanonicalEmail,
  linkNewsletterSubscriberToUser
} = require("../models/newsletterModel");
const { issueGuestPasswordSetupLink } = require("./passwordSetService");

function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

/**
 * Guest checkout: ensure a user row exists so they can access My Hub.
 * New accounts receive a secure set-password link (no plaintext password in email).
 */
async function ensureGuestUserAccount({ name, email, phone }) {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return { userId: null, created: false, email: null, setPasswordUrl: null };
  }

  const existing = await findUserByEmail(normalizedEmail);
  if (existing) {
    return {
      userId: existing.id,
      created: false,
      email: normalizedEmail,
      setPasswordUrl: null
    };
  }

  const randomSecret = crypto.randomBytes(24).toString("hex");
  const passwordHash = await bcrypt.hash(randomSecret, 12);
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

  const setPasswordUrl = await issueGuestPasswordSetupLink(userId);

  return {
    userId,
    created: true,
    email: normalizedEmail,
    setPasswordUrl
  };
}

module.exports = {
  ensureGuestUserAccount
};
