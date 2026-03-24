const bcrypt = require("bcryptjs");
const ApiError = require("../utils/ApiError");
const { generateAccessToken, generateRefreshToken, verifyRefreshToken } = require("../utils/jwt");
const { findUserByEmail, createUser, findUserById } = require("../models/userModel");
const { upsertUserOnboardingProfile } = require("../models/userOnboardingProfileModel");
const { createInfluencer } = require("../models/influencerModel");
const { createDealerProfile } = require("../models/dealerProfileModel");
const { createAdminNotification } = require("../models/adminModel");

async function register(payload) {
  const existing = await findUserByEmail(payload.email);
  if (existing) {
    throw new ApiError(409, "Email already in use");
  }

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const name = `${payload.first_name} ${payload.last_name}`.trim();
  const userId = await createUser({
    name,
    email: payload.email,
    mobileNumber: payload.mobile_number,
    passwordHash,
    role: "user",
    organizerEnabled: false
  });

  try {
    await upsertUserOnboardingProfile({
      userId,
      firstName: payload.first_name,
      lastName: payload.last_name,
      mobileNumber: payload.mobile_number,
      cityId: payload.city_id,
      interests: payload.interests || [],
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
      contact_email: payload.influencer_profile.contact_email || payload.email,
      profile_image_url: payload.influencer_profile.profile_image_url || null,
      created_by: userId
    });
  }

  if (payload.wants_deal && payload.deal_profile) {
    const dealerId = await createDealerProfile({
      created_by: userId,
      name: payload.deal_profile.name,
      business_email: payload.deal_profile.business_email || payload.email,
      business_mobile: payload.deal_profile.business_mobile || payload.mobile_number,
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

  const tokenPayload = {
    id: userId,
    email: payload.email,
    role: "user",
    organizer_enabled: 0,
    can_post_events: 1,
    can_create_influencer_profile: 1,
    can_post_deals: 1
  };

  return {
    userId,
    accessToken: generateAccessToken(tokenPayload),
    refreshToken: generateRefreshToken(tokenPayload),
    user: {
      id: userId,
      name,
      email: payload.email,
      mobile_number: payload.mobile_number,
      role: "user",
      organizer_enabled: 0,
      can_post_events: 1,
      can_create_influencer_profile: 1,
      can_post_deals: 1
    }
  };
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

  // Users remain role='user' even when organizer capabilities are enabled.
  // They should still be able to log in via the regular user portal.
  if (portal === "user" && user.role !== "user") {
    throw new ApiError(403, "Please use staff login for this account");
  }
  if (portal === "staff") {
    const allowed =
      user.role === "admin" || user.organizer_enabled === 1 || user.role === "organizer";
    if (!allowed) {
      throw new ApiError(403, "Please use user login for this account");
    }
  }

  const tokenPayload = {
    id: user.id,
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
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile_number: user.mobile_number,
      role: user.role,
      organizer_enabled: user.organizer_enabled === 1 ? 1 : 0,
      can_post_events: user.can_post_events === 1 ? 1 : 0,
      can_create_influencer_profile: user.can_create_influencer_profile === 1 ? 1 : 0,
      can_post_deals: user.can_post_deals === 1 ? 1 : 0
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
    role: user.role,
    organizer_enabled: user.organizer_enabled === 1 ? 1 : 0,
    can_post_events: user.can_post_events === 1 ? 1 : 0,
    can_create_influencer_profile: user.can_create_influencer_profile === 1 ? 1 : 0,
    can_post_deals: user.can_post_deals === 1 ? 1 : 0
  };

  return {
    accessToken: generateAccessToken(tokenPayload),
    refreshToken: generateRefreshToken(tokenPayload),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      mobile_number: user.mobile_number,
      role: user.role,
      organizer_enabled: user.organizer_enabled === 1 ? 1 : 0,
      can_post_events: user.can_post_events === 1 ? 1 : 0,
      can_create_influencer_profile: user.can_create_influencer_profile === 1 ? 1 : 0,
      can_post_deals: user.can_post_deals === 1 ? 1 : 0
    }
  };
}

module.exports = {
  register,
  login,
  refreshAccessToken
};
