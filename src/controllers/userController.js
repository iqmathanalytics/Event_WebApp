const bcrypt = require("bcryptjs");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const {
  enableOrganizerById,
  findUserByEmail,
  findUserById,
  updateUserProfileById,
  updatePasswordHashByUserId
} = require("../models/userModel");
const {
  findUserOnboardingProfileByUserId,
  upsertUserOnboardingProfile
} = require("../models/userOnboardingProfileModel");
const {
  createInfluencer,
  findAnyInfluencerByCreator,
  findInfluencerById,
  updateInfluencerByCreator
} = require("../models/influencerModel");
const { resolveInfluencerSocialMetrics } = require("../services/influencerService");
const {
  createDealerProfile,
  findLatestDealerProfileByCreator,
  updateDealerProfileByCreator
} = require("../models/dealerProfileModel");
const { createAdminNotification } = require("../models/adminModel");
const { syncSubscriberEmail } = require("../models/newsletterModel");
const bookingService = require("../services/bookingService");

const getMe = asyncHandler(async (req, res) => {
  const user = await findUserById(req.user.id);
  const credRow = user?.email ? await findUserByEmail(user.email) : null;
  const has_local_password = Boolean(credRow?.password_hash);
  let onboarding = null;
  const dealerProfile = await findLatestDealerProfileByCreator(req.user.id).catch((err) => {
    if (err?.code === "ER_NO_SUCH_TABLE") {
      return null;
    }
    throw err;
  });
  try {
    onboarding = await findUserOnboardingProfileByUserId(req.user.id);
  } catch (err) {
    if (err?.code !== "ER_NO_SUCH_TABLE") {
      throw err;
    }
  }
  res.status(200).json({
    success: true,
    data: {
      ...user,
      has_local_password,
      onboarding: onboarding
        ? {
            first_name: onboarding.first_name || "",
            last_name: onboarding.last_name || "",
            mobile_number: onboarding.mobile_number || "",
            city_id: onboarding.city_id || null,
            interests: parseJsonArray(onboarding.interests_json),
            wants_influencer: Boolean(onboarding.wants_influencer),
            wants_deal: Boolean(onboarding.wants_deal)
          }
        : null,
      dealer_profile: dealerProfile || null
    }
  });
});

const getMyBookings = asyncHandler(async (req, res) => {
  const rows = await bookingService.fetchUserBookings({ userId: req.user.id });
  res.status(200).json({
    success: true,
    data: rows
  });
});

const enableOrganizer = asyncHandler(async (req, res) => {
  // Upgrade is instant and flag-based; organizers are still role='user'.
  const updated = await enableOrganizerById(req.user.id);
  if (!updated) {
    return res.status(400).json({
      success: false,
      message: "Unable to enable organizer capabilities for this account"
    });
  }

  const user = await findUserById(req.user.id);
  return res.status(200).json({ success: true, data: user });
});

const updateMyProfile = asyncHandler(async (req, res) => {
  const firstName = String(req.body?.first_name || "").trim();
  const lastName = String(req.body?.last_name || "").trim();
  const name = `${firstName} ${lastName}`.trim();
  const email = String(req.body?.email || "").trim().toLowerCase();
  const mobile_number = String(req.body?.mobile_number || "").trim();
  const cityId = req.body?.city_id ? Number(req.body.city_id) : null;
  const interests = Array.isArray(req.body?.interests)
    ? req.body.interests.map((item) => String(item).trim()).filter(Boolean).slice(0, 8)
    : [];
  const wantsInfluencer = Boolean(req.body?.wants_influencer);
  const wantsDeal = Boolean(req.body?.wants_deal);
  const influencerProfile = req.body?.influencer_profile || null;
  const dealProfile = req.body?.deal_profile || null;

  if (name.length < 2 || name.length > 120) {
    return res.status(400).json({
      success: false,
      message: "Name must be between 2 and 120 characters"
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address"
    });
  }

  const existing = await findUserByEmail(email);
  if (existing && Number(existing.id) !== Number(req.user.id)) {
    return res.status(409).json({
      success: false,
      message: "Email already in use"
    });
  }

  const currentUser = await findUserById(req.user.id);

  await updateUserProfileById({
    id: req.user.id,
    name,
    email,
    mobile_number: mobile_number || null
  });

  // Keep newsletter subscriber rows mapped after user email changes.
  await syncSubscriberEmail({
    oldEmail: currentUser?.email,
    newEmail: email
  }).catch((err) => {
    if (err?.code !== "ER_NO_SUCH_TABLE") {
      throw err;
    }
  });

  if (!cityId) {
    return res.status(400).json({
      success: false,
      message: "City is required"
    });
  }

  try {
    await upsertUserOnboardingProfile({
      userId: req.user.id,
      firstName,
      lastName,
      mobileNumber: mobile_number,
      cityId,
      interests,
      wantsInfluencer,
      wantsDeal
    });
  } catch (err) {
    if (err?.code !== "ER_NO_SUCH_TABLE") {
      throw err;
    }
  }

  if (wantsInfluencer && !influencerProfile) {
    return res.status(400).json({
      success: false,
      message: "Influencer details are required"
    });
  }

  let influencerResubmittedForReview = false;
  if (wantsInfluencer && influencerProfile) {
    if (!String(influencerProfile.name || "").trim() || !Number(influencerProfile.category_id)) {
      return res.status(400).json({
        success: false,
        message: "Influencer name and category are required"
      });
    }
    const social_links = {
      instagram: String(influencerProfile.instagram || "").trim(),
      facebook: String(influencerProfile.facebook || "").trim(),
      youtube: String(influencerProfile.youtube || "").trim()
    };
    const existingInfluencer = await findAnyInfluencerByCreator(req.user.id);
    const existingInfluencerDetails = existingInfluencer?.id ? await findInfluencerById(existingInfluencer.id) : null;
    const payload = {
      name: String(influencerProfile.name || "").trim(),
      bio: String(influencerProfile.bio || "").trim(),
      city_id: cityId,
      category_id: Number(influencerProfile.category_id),
      social_links,
      contact_email: String(influencerProfile.contact_email || email).trim(),
      profile_image_url: influencerProfile.profile_image_url
        ? String(influencerProfile.profile_image_url).trim()
        : null
    };
    const socialMetrics = await resolveInfluencerSocialMetrics(
      {
        instagram: payload.social_links.instagram,
        facebook: payload.social_links.facebook,
        youtube: payload.social_links.youtube
      },
      {
        fallbackInstagramFollowers: 0,
        fallbackFacebookFollowers: 0,
        fallbackYoutubeSubscribers: 0
      }
    );
    payload.followers_count = socialMetrics.followers_count;
    payload.facebook_followers_count = socialMetrics.facebook_followers_count;
    payload.youtube_subscribers_count = socialMetrics.youtube_subscribers_count;
    if (existingInfluencer?.id) {
      const hasInfluencerChanges =
        String(existingInfluencerDetails?.name || "").trim() !== payload.name ||
        String(existingInfluencerDetails?.bio || "").trim() !== payload.bio ||
        Number(existingInfluencerDetails?.city_id || 0) !== Number(payload.city_id || 0) ||
        Number(existingInfluencerDetails?.category_id || 0) !== Number(payload.category_id || 0) ||
        String(existingInfluencerDetails?.social_links || "").trim() !== JSON.stringify(payload.social_links || {}) ||
        Number(existingInfluencerDetails?.followers_count || 0) !== Number(payload.followers_count || 0) ||
        Number(existingInfluencerDetails?.facebook_followers_count || 0) !== Number(payload.facebook_followers_count || 0) ||
        Number(existingInfluencerDetails?.youtube_subscribers_count || 0) !== Number(payload.youtube_subscribers_count || 0) ||
        String(existingInfluencerDetails?.contact_email || "").trim() !== payload.contact_email ||
        String(existingInfluencerDetails?.profile_image_url || "").trim() !== String(payload.profile_image_url || "").trim();
      if (hasInfluencerChanges) {
        await updateInfluencerByCreator({
          id: existingInfluencer.id,
          createdBy: req.user.id,
          payload
        });
        influencerResubmittedForReview = true;
      }
    } else {
      await createInfluencer({
        ...payload,
        social_links: payload.social_links,
        created_by: req.user.id
      });
      influencerResubmittedForReview = true;
    }
  }

  if (wantsDeal && !dealProfile) {
    return res.status(400).json({
      success: false,
      message: "Deal details are required"
    });
  }

  if (wantsDeal && dealProfile) {
    if (!String(dealProfile.name || "").trim() || !Number(dealProfile.category_id)) {
      return res.status(400).json({
        success: false,
        message: "Business name and category are required"
      });
    }
    const existingDealer = await findLatestDealerProfileByCreator(req.user.id);
    const payload = {
      name: String(dealProfile.name || "").trim(),
      business_email: String(dealProfile.business_email || email).trim(),
      business_mobile: String(dealProfile.business_mobile || mobile_number).trim(),
      location_text: String(dealProfile.location_text || "").trim(),
      city_id: cityId,
      category_id: Number(dealProfile.category_id),
      bio: String(dealProfile.bio || "").trim(),
      website_or_social_link: String(dealProfile.website_or_social_link || "").trim(),
      profile_image_url: String(dealProfile.profile_image_url || "").trim()
    };
    if (existingDealer?.id) {
      const hasDealerChanges =
        String(existingDealer.name || "").trim() !== payload.name ||
        String(existingDealer.business_email || "").trim() !== payload.business_email ||
        String(existingDealer.business_mobile || "").trim() !== payload.business_mobile ||
        String(existingDealer.location_text || "").trim() !== payload.location_text ||
        Number(existingDealer.city_id || 0) !== Number(payload.city_id || 0) ||
        Number(existingDealer.category_id || 0) !== Number(payload.category_id || 0) ||
        String(existingDealer.bio || "").trim() !== payload.bio ||
        String(existingDealer.website_or_social_link || "").trim() !== payload.website_or_social_link ||
        String(existingDealer.profile_image_url || "").trim() !== payload.profile_image_url;
      if (hasDealerChanges) {
        await updateDealerProfileByCreator({
          id: existingDealer.id,
          createdBy: req.user.id,
          payload
        });
      }
    } else {
      const dealerId = await createDealerProfile({
        ...payload,
        created_by: req.user.id
      });
      await createAdminNotification({
        type: "system",
        entityType: "other",
        entityId: dealerId,
        title: "New dealer profile submitted",
        message: `Dealer profile #${dealerId} is awaiting moderation.`
      });
    }
  }

  const user = await findUserById(req.user.id);
  let onboarding = null;
  const dealerProfile = await findLatestDealerProfileByCreator(req.user.id).catch((err) => {
    if (err?.code === "ER_NO_SUCH_TABLE") {
      return null;
    }
    throw err;
  });
  try {
    onboarding = await findUserOnboardingProfileByUserId(req.user.id);
  } catch (err) {
    if (err?.code !== "ER_NO_SUCH_TABLE") {
      throw err;
    }
  }
  const message = influencerResubmittedForReview
    ? "Your influencer profile update has been submitted for admin review. You will see it live once approved."
    : "Profile updated successfully";

  return res.status(200).json({
    success: true,
    message,
    data: {
      ...user,
      onboarding: onboarding
        ? {
            first_name: onboarding.first_name || "",
            last_name: onboarding.last_name || "",
            mobile_number: onboarding.mobile_number || "",
            city_id: onboarding.city_id || null,
            interests: parseJsonArray(onboarding.interests_json),
            wants_influencer: Boolean(onboarding.wants_influencer),
            wants_deal: Boolean(onboarding.wants_deal)
          }
        : null,
      dealer_profile: dealerProfile || null
    }
  });
});

const changeMyPassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.validated.body;
  const me = await findUserById(req.user.id);
  if (!me?.email) {
    throw new ApiError(400, "Account not found");
  }
  const row = await findUserByEmail(me.email);
  const hasExistingPassword = Boolean(row?.password_hash);
  const isGoogle = String(me.auth_provider || "").toLowerCase() === "google";

  if (hasExistingPassword) {
    const current = String(current_password || "").trim();
    if (!current) {
      throw new ApiError(400, "Current password is required.");
    }
    const match = await bcrypt.compare(current, row.password_hash);
    if (!match) {
      throw new ApiError(401, "Current password is incorrect.");
    }
  } else if (isGoogle) {
    // Google account, first local password — session proves identity; no current password.
    if (String(current_password || "").trim()) {
      throw new ApiError(400, "Leave current password blank when setting your first password.");
    }
  } else {
    throw new ApiError(400, "Use the password reset flow for your account type.");
  }

  const passwordHash = await bcrypt.hash(new_password, 12);
  const ok = await updatePasswordHashByUserId({ id: req.user.id, passwordHash });
  if (!ok) {
    throw new ApiError(400, "Could not update password");
  }
  const message =
    isGoogle && !hasExistingPassword
      ? "Your password has been set. You can sign in with email and password anytime."
      : "Password updated successfully.";
  res.status(200).json({
    success: true,
    message
  });
});

function parseJsonArray(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (_err) {
    return [];
  }
}

module.exports = { getMe, getMyBookings, enableOrganizer, updateMyProfile, changeMyPassword };
