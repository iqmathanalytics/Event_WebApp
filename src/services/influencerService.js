const ApiError = require("../utils/ApiError");
const { createAdminNotification } = require("../models/adminModel");
const {
  listInfluencers,
  createInfluencer,
  listInfluencersByCreator,
  findPendingInfluencerByCreator,
  findAnyInfluencerByCreator,
  findInfluencerById,
  updateInfluencerByCreator
} = require("../models/influencerModel");
const { getDateRange, getMonthRange } = require("../utils/dateRange");

async function fetchInfluencers(query) {
  const { dateStart, dateEnd } = getDateRange(query.date || null);
  const { monthStart, monthEnd } = getMonthRange(query.month || null);
  return listInfluencers({
    cityId: query.city ? Number(query.city) : null,
    categoryId: query.category ? Number(query.category) : null,
    dateStart,
    dateEnd,
    monthStart,
    monthEnd,
    q: query.q || query.search || null,
    sortBy: query.sort || "popularity"
  });
}

async function submitInfluencer(payload, userId) {
  const existingInfluencer = await findAnyInfluencerByCreator(userId);
  if (existingInfluencer) {
    throw new ApiError(
      409,
      "You can submit only one influencer profile. Please edit your existing profile instead of creating a new one."
    );
  }

  const social_links = {
    instagram: payload.instagram || "",
    youtube: payload.youtube || ""
  };

  try {
    const influencerId = await createInfluencer({
      name: payload.name,
      bio: payload.bio || "",
      city_id: payload.city_id,
      category_id: payload.category_id,
      social_links,
      contact_email: payload.contact_email || "",
      profile_image_url: payload.profile_image_url || "",
      created_by: userId
    });

    await createAdminNotification({
      type: "service_submitted",
      entityType: "influencer",
      entityId: influencerId,
      title: "New influencer profile submitted",
      message: `Influencer profile #${influencerId} is awaiting moderation.`
    });

    return { influencerId };
  } catch (err) {
    if (err?.code === "ER_NO_REFERENCED_ROW_2") {
      throw new ApiError(400, "Selected city or category is invalid. Please reselect and try again.");
    }
    throw err;
  }
}

async function fetchMyInfluencerSubmissions(userId) {
  return listInfluencersByCreator(userId);
}

async function editOwnInfluencerSubmission(id, payload, userId) {
  const existing = await findInfluencerById(id);
  if (!existing) {
    throw new ApiError(404, "Influencer submission not found");
  }
  if (Number(existing.created_by) !== Number(userId)) {
    throw new ApiError(403, "You can only edit your own influencer submission");
  }
  if (existing.status !== "approved") {
    throw new ApiError(400, "Only approved influencer submissions can be edited");
  }

  const social_links = {
    instagram: payload.instagram || "",
    youtube: payload.youtube || ""
  };
  const updated = await updateInfluencerByCreator({
    id,
    createdBy: userId,
    payload: {
      name: payload.name,
      bio: payload.bio,
      city_id: payload.city_id,
      category_id: payload.category_id,
      social_links,
      contact_email: payload.contact_email,
      profile_image_url: payload.profile_image_url
    }
  });
  if (!updated) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  await createAdminNotification({
    type: "service_submitted",
    entityType: "influencer",
    entityId: id,
    title: "Influencer profile updated",
    message: `Influencer profile #${id} was updated and is awaiting moderation.`
  });
}

module.exports = {
  fetchInfluencers,
  submitInfluencer,
  fetchMyInfluencerSubmissions,
  editOwnInfluencerSubmission
};
