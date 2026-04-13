const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");
const ApiError = require("../utils/ApiError");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const {
  findUserByEmail,
  createUser,
  findUserById,
  updateUserAfterGoogleSignIn
} = require("../models/userModel");
const { upsertUserOnboardingProfile } = require("../models/userOnboardingProfileModel");
const { createInfluencer } = require("../models/influencerModel");
const { createDealerProfile } = require("../models/dealerProfileModel");
const { createAdminNotification } = require("../models/adminModel");
const {
  alignNewsletterRowsToCanonicalEmail,
  linkNewsletterSubscriberToUser
} = require("../models/newsletterModel");

function splitDisplayName(full) {
  const t = String(full || "User").trim() || "User";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return { first: "User", last: "-" };
  }
  if (parts.length === 1) {
    return { first: parts[0], last: "-" };
  }
  return { first: parts[0], last: parts.slice(1).join(" ") };
}

function buildAuthUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    mobile_number: user.mobile_number,
    role: user.role,
    organizer_enabled: user.organizer_enabled === 1 ? 1 : 0,
    can_post_events: user.can_post_events === 1 ? 1 : 0,
    can_create_influencer_profile: user.can_create_influencer_profile === 1 ? 1 : 0,
    can_post_deals: user.can_post_deals === 1 ? 1 : 0,
    profile_image_url: user.profile_image_url || null,
    auth_provider: user.auth_provider || "local"
  };
}

function tokensForUser(user) {
  const uid = user?.id;
  const tokenPayload = {
    id: uid != null && typeof uid === "bigint" ? Number(uid) : uid,
    email: user.email,
    role: user.role,
    organizer_enabled: user.organizer_enabled === 1 ? 1 : 0,
    can_post_events: user.can_post_events === 1 ? 1 : 0,
    can_create_influencer_profile: user.can_create_influencer_profile === 1 ? 1 : 0,
    can_post_deals: user.can_post_deals === 1 ? 1 : 0
  };
  return {
    accessToken: generateAccessToken(tokenPayload),
    refreshToken: generateRefreshToken(tokenPayload),
    user: buildAuthUser(user)
  };
}

async function verifyGoogleIdToken(idToken) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new ApiError(503, "Google sign-in is not configured");
  }
  const client = new OAuth2Client(clientId);
  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId
    });
    return ticket.getPayload();
  } catch (_err) {
    throw new ApiError(401, "Invalid or expired Google sign-in. Please try again.");
  }
}

async function register(payload) {
  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  const existing = await findUserByEmail(email);
  if (existing) {
    throw new ApiError(409, "Email already in use");
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const name = `${payload.first_name} ${payload.last_name}`.trim();
  const userId = await createUser({
    name,
    email,
    mobileNumber: payload.mobile_number || null,
    passwordHash,
    role: "user",
    organizerEnabled: false
  });

  await alignNewsletterRowsToCanonicalEmail(email).catch(() => {});
  await linkNewsletterSubscriberToUser(userId, email).catch(() => {});

  try {
    await upsertUserOnboardingProfile({
      userId,
      firstName: payload.first_name,
      lastName: payload.last_name,
      mobileNumber: payload.mobile_number || null,
      cityId: payload.city_id ?? null,
      interests: Array.isArray(payload.interests) ? payload.interests : [],
      wantsInfluencer: Boolean(payload.wants_influencer),
      wantsDeal: Boolean(payload.wants_deal)
    });
  } catch (err) {
    if (err?.code !== "ER_NO_SUCH_TABLE") {
      throw err;
    }
  }

  if (payload.wants_influencer && payload.influencer_profile) {
    await createInfluencer({
      name: payload.influencer_profile.name,
      bio: payload.influencer_profile.bio || "",
      city_id: payload.city_id,
      category_id: payload.influencer_profile.category_id,
      social_links: null,
      contact_email: payload.influencer_profile.contact_email || email,
      profile_image_url: payload.influencer_profile.profile_image_url || null,
      created_by: userId
    });
  }

  if (payload.wants_deal && payload.deal_profile) {
    const dealerId = await createDealerProfile({
      created_by: userId,
      name: payload.deal_profile.name,
      business_email: payload.deal_profile.business_email || email,
      business_mobile: payload.deal_profile.business_mobile || payload.mobile_number || "",
      location_text: payload.deal_profile.location_text || "",
      city_id: payload.city_id,
      category_id: payload.deal_profile.category_id,
      bio: payload.deal_profile.bio || "",
      website_or_social_link: payload.deal_profile.website_or_social_link || "",
      profile_image_url: payload.deal_profile.profile_image_url || ""
    });
    await createAdminNotification({
      type: "system",
      entityType: "other",
      entityId: dealerId,
      title: "New dealer profile submitted",
      message: `Dealer profile #${dealerId} is awaiting moderation.`
    });
  }

  return {
    userId,
    ...tokensForUser({
      id: userId,
      name,
      email,
      mobile_number: payload.mobile_number || null,
      role: "user",
      organizer_enabled: 0,
      can_post_events: 1,
      can_create_influencer_profile: 1,
      can_post_deals: 1,
      profile_image_url: null,
      auth_provider: "local"
    })
  };
}

async function login({ email, password, portal }) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  const user = await findUserByEmail(normalizedEmail);
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }
  if (!user.is_active) {
    throw new ApiError(403, "Account is deactivated");
  }

  if (!user.password_hash) {
    throw new ApiError(401, "This account uses Google sign-in. Use Continue with Google.");
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    throw new ApiError(401, "Invalid email or password");
  }

  // Users remain role='user' even when organizer capabilities are enabled.
  // They should still be able to log in via the regular user portal.
  if (portal === "user" && user.role !== "user") {
    throw new ApiError(403, "Invalid email or password");
  }
  if (portal === "staff") {
    const allowed =
      user.role === "admin" || user.organizer_enabled === 1 || user.role === "organizer";
    if (!allowed) {
      throw new ApiError(403, "Invalid email or password");
    }
  }

  const fresh = await findUserById(user.id);
  const sessionUser = fresh || user;
  await alignNewsletterRowsToCanonicalEmail(sessionUser.email).catch(() => {});
  await linkNewsletterSubscriberToUser(sessionUser.id, sessionUser.email).catch(() => {});
  return tokensForUser(sessionUser);
}

async function readGoogleIdentity(idToken) {
  const payload = await verifyGoogleIdToken(idToken);
  const email = payload.email;
  const emailVerified = payload.email_verified;
  const sub = payload.sub;
  const name = (payload.name || "").trim() || "User";
  const picture = payload.picture || null;

  if (!email || !emailVerified) {
    throw new ApiError(400, "Google did not return a verified email for this account.");
  }

  return { email: String(email).trim().toLowerCase(), sub, name, picture };
}

async function finalizeGoogleUserSession(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw new ApiError(500, "Could not complete Google sign-in.");
  }
  await alignNewsletterRowsToCanonicalEmail(user.email).catch(() => {});
  await linkNewsletterSubscriberToUser(user.id, user.email).catch(() => {});
  return tokensForUser(user);
}

/**
 * User portal: Google sign-in only for accounts that already exist.
 */
async function loginWithGoogleIdToken(idToken) {
  const { email, sub, name, picture } = await readGoogleIdentity(idToken);
  const user = await findUserByEmail(email);

  if (!user) {
    throw new ApiError(
      404,
      "We could not find a Yay! Eventz account for this Google sign-in. Please create an account first, then sign in here."
    );
  }

  if (!user.is_active) {
    throw new ApiError(403, "Account is deactivated.");
  }
  if (user.role !== "user") {
    throw new ApiError(403, "This sign-in method is not available for this account.");
  }
  if (user.google_id && user.google_id !== sub) {
    throw new ApiError(
      409,
      "This email is linked to a different Google account. Use the same Google profile you used when you signed up, or sign in with email and password."
    );
  }

  await updateUserAfterGoogleSignIn({
    id: user.id,
    googleId: sub,
    profileImageUrl: picture,
    displayName: name
  });

  return finalizeGoogleUserSession(user.id);
}

/**
 * User portal: Google registration — creates an account only when email is new.
 */
async function registerWithGoogleIdToken(idToken) {
  const { email, sub, name, picture } = await readGoogleIdentity(idToken);
  const existing = await findUserByEmail(email);

  if (existing) {
    throw new ApiError(
      409,
      "An account with this email already exists. Sign in with Google on the login page, or use your email and password."
    );
  }

  const userId = await createUser({
    name,
    email,
    mobileNumber: null,
    passwordHash: null,
    role: "user",
    organizerEnabled: false,
    authProvider: "google",
    googleId: sub,
    profileImageUrl: picture
  });

  await alignNewsletterRowsToCanonicalEmail(email).catch(() => {});
  await linkNewsletterSubscriberToUser(userId, email).catch(() => {});

  try {
    const { first, last } = splitDisplayName(name);
    await upsertUserOnboardingProfile({
      userId,
      firstName: first,
      lastName: last,
      mobileNumber: null,
      cityId: null,
      interests: [],
      wantsInfluencer: false,
      wantsDeal: false
    });
  } catch (err) {
    if (err?.code !== "ER_NO_SUCH_TABLE") {
      throw err;
    }
  }

  return finalizeGoogleUserSession(userId);
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

  await alignNewsletterRowsToCanonicalEmail(user.email).catch(() => {});
  await linkNewsletterSubscriberToUser(user.id, user.email).catch(() => {});

  return tokensForUser(user);
}

module.exports = {
  register,
  login,
  loginWithGoogleIdToken,
  registerWithGoogleIdToken,
  refreshAccessToken
};
