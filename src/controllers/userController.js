const asyncHandler = require("../utils/asyncHandler");
const { enableOrganizerById, findUserByEmail, findUserById, updateUserProfileById } = require("../models/userModel");
const {
  findUserOnboardingProfileByUserId,
  upsertUserOnboardingProfile
} = require("../models/userOnboardingProfileModel");
const {
  createInfluencer,
  findAnyInfluencerByCreator,
  updateInfluencerByCreator
} = require("../models/influencerModel");
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

  if (wantsInfluencer && influencerProfile) {
    if (!String(influencerProfile.name || "").trim() || !Number(influencerProfile.category_id)) {
      return res.status(400).json({
        success: false,
        message: "Influencer name and category are required"
      });
    }
    const existingInfluencer = await findAnyInfluencerByCreator(req.user.id);
    const payload = {
      name: String(influencerProfile.name || "").trim(),
      bio: String(influencerProfile.bio || "").trim(),
      city_id: cityId,
      category_id: Number(influencerProfile.category_id),
      contact_email: String(influencerProfile.contact_email || email).trim(),
      profile_image_url: influencerProfile.profile_image_url
        ? String(influencerProfile.profile_image_url).trim()
        : null
    };
    if (existingInfluencer?.id) {
      const hasInfluencerChanges =
        String(existingInfluencer.name || "").trim() !== payload.name ||
        String(existingInfluencer.bio || "").trim() !== payload.bio ||
        Number(existingInfluencer.city_id || 0) !== Number(payload.city_id || 0) ||
        Number(existingInfluencer.category_id || 0) !== Number(payload.category_id || 0) ||
        String(existingInfluencer.contact_email || "").trim() !== payload.contact_email ||
        String(existingInfluencer.profile_image_url || "").trim() !== String(payload.profile_image_url || "").trim();
      if (hasInfluencerChanges) {
        await updateInfluencerByCreator({
          id: existingInfluencer.id,
          createdBy: req.user.id,
          payload
        });
      }
    } else {
      await createInfluencer({
        ...payload,
        social_links: null,
        created_by: req.user.id
      });
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
  return res.status(200).json({
    success: true,
    message: "Profile updated successfully",
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

module.exports = { getMe, getMyBookings, enableOrganizer, updateMyProfile };
