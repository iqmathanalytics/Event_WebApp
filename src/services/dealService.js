const ApiError = require("../utils/ApiError");
const { createAdminNotification } = require("../models/adminModel");
const {
  listDeals,
  createDeal,
  listDealsByCreator,
  findDealById,
  findPublicDealById,
  updateDealByCreator,
  incrementDealPopularity
} = require("../models/dealModel");
const { getMonthRange } = require("../utils/dateRange");

const DEAL_TAG_RULES = Object.freeze({
  hotSellingMinDiscountPercent: 30,
  trendingMinRecentEngagement: 20,
  trendingMinTotalEngagement: 30,
  recentlyAddedWindowDays: 10
});

function toNumber(value) {
  if (typeof value === "bigint") {
    return Number(value);
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Match events: recent = clicks + views*2 only when row was touched in last 14 days (see SQL). */
function resolveDealRecentEngagement(deal) {
  const raw = deal.recent_engagement_score;
  if (raw != null && raw !== "") {
    return toNumber(raw);
  }
  const updatedAt = deal.updated_at;
  if (!updatedAt) {
    return 0;
  }
  const ms = new Date(updatedAt).getTime();
  if (!Number.isFinite(ms)) {
    return 0;
  }
  if (Date.now() - ms > 14 * 86400000) {
    return 0;
  }
  return toNumber(deal.click_count) + toNumber(deal.view_count) * 2;
}

function attachDynamicDealTags(deal) {
  const originalPrice = toNumber(deal.original_price);
  const discountedPrice = toNumber(deal.discounted_price);
  const discountPercent =
    originalPrice > 0 && discountedPrice > 0
      ? Math.max(0, Math.round(((originalPrice - discountedPrice) / originalPrice) * 100))
      : toNumber(deal.discount_percentage);
  const clickCount = toNumber(deal.click_count);
  const viewCount = toNumber(deal.view_count);
  const recentEngagement = resolveDealRecentEngagement(deal);
  const totalEngagement = clickCount + viewCount;
  const offerType = String(deal.offer_type || "");
  const hasSpecialOfferType = ["bogo", "bundle_price", "free_item", "custom"].includes(offerType);
  const createdMs = new Date(deal.created_at || "").getTime();
  const isRecentlyAdded = Number.isFinite(createdMs)
    ? Date.now() - createdMs <= DEAL_TAG_RULES.recentlyAddedWindowDays * 86400000
    : false;

  const isTrending =
    recentEngagement >= DEAL_TAG_RULES.trendingMinRecentEngagement ||
    totalEngagement >= DEAL_TAG_RULES.trendingMinTotalEngagement;
  const isHotSelling = discountPercent >= DEAL_TAG_RULES.hotSellingMinDiscountPercent;
  // Premium uses the card badge only; extra tags come after in this order: Trending → Hot Selling → One of a Kind
  const isOneOfAKind = hasSpecialOfferType;

  const tags = [];
  if (isTrending) {
    tags.push("Trending");
  }
  if (isRecentlyAdded) {
    tags.push("Recently Added");
  }
  if (isHotSelling) {
    tags.push("Hot Selling");
  }
  if (isOneOfAKind) {
    tags.push("One of a Kind");
  }

  return {
    ...deal,
    tags
  };
}

/** Listing order: Premium deals first, then Trending, then Hot Selling (matches on-card tag priority after Premium). */
function dealDiscoverySortKey(deal) {
  const premium = deal.is_premium === 1 || deal.is_premium === true ? 1 : 0;
  const tags = deal.tags || [];
  const trending = tags.includes("Trending") ? 1 : 0;
  const recent = tags.includes("Recently Added") ? 1 : 0;
  const hot = tags.includes("Hot Selling") ? 1 : 0;
  const ook = tags.includes("One of a Kind") ? 1 : 0;
  return (
    premium * 1_000_000_000 +
    trending * 10_000_000 +
    recent * 1_000_000 +
    hot * 100_000 +
    ook * 1_000 +
    toNumber(deal.popularity_score)
  );
}

async function fetchDeals(query, user) {
  const includePremium = Boolean(user);
  const cityId = query.city ? Number(query.city) : null;
  const categoryId = query.category ? Number(query.category) : null;
  const { monthStart, monthEnd } = getMonthRange(query.month || null);

  const rows = await listDeals({
    cityId,
    categoryId,
    includePremium,
    date: query.date || null,
    monthStart,
    monthEnd,
    priceMin: query.price_min ? Number(query.price_min) : null,
    priceMax: query.price_max ? Number(query.price_max) : null,
    q: query.q || query.search || null,
    onlyActive: query.only_active !== "false",
    sortBy: query.sort || "newest",
    sortOrder: query.sort_order || "asc"
  });

  const tagged = rows.map(attachDynamicDealTags);
  const sortByKey = query.sort || "newest";
  const hasSearch = Boolean(query.q || query.search);

  if (sortByKey === "price") {
    return tagged;
  }
  if (sortByKey === "relevance" && hasSearch) {
    return tagged;
  }

  return tagged.sort((a, b) => {
    const keyDiff = dealDiscoverySortKey(b) - dealDiscoverySortKey(a);
    if (keyDiff !== 0) {
      return keyDiff;
    }
    if (sortByKey === "newest") {
      return String(b.created_at || "").localeCompare(String(a.created_at || ""));
    }
    return toNumber(b.popularity_score) - toNumber(a.popularity_score);
  });
}

async function submitDeal(payload, userId) {
  try {
    const dealId = await createDeal({
      title: payload.title,
      description: payload.description || "",
      city_id: payload.city_id,
      category_id: payload.category_id,
      provider_name: payload.provider_name || "",
      original_price: null,
      discounted_price: null,
      expiry_date: payload.expiry_date,
      deal_link: payload.deal_link || "",
      promo_code: payload.promo_code || "",
      image_url: payload.image_url || "",
      is_premium: payload.is_premium === true || payload.is_premium === 1,
      offer_type: null,
      offer_meta_json: null,
      terms_text: payload.terms_text || "",
      created_by: userId
    });

    await createAdminNotification({
      type: "deal_submitted",
      entityType: "deal",
      entityId: dealId,
      title: "New deal submitted",
      message: `Deal #${dealId} is awaiting moderation.`
    });

    return { dealId };
  } catch (err) {
    if (err?.code === "ER_NO_REFERENCED_ROW_2") {
      throw new ApiError(400, "Selected city or category is invalid. Please reselect and try again.");
    }
    throw err;
  }
}

async function fetchMyDealSubmissions(userId) {
  return listDealsByCreator(userId);
}

async function fetchDealById(id) {
  const deal = await findPublicDealById(id);
  if (!deal) {
    throw new ApiError(404, "Deal not found");
  }
  return attachDynamicDealTags(deal);
}

async function editOwnDealSubmission(id, payload, userId) {
  const existing = await findDealById(id);
  if (!existing) {
    throw new ApiError(404, "Deal submission not found");
  }
  if (Number(existing.created_by) !== Number(userId)) {
    throw new ApiError(403, "You can only edit your own deal submission");
  }
  if (existing.status !== "approved") {
    throw new ApiError(400, "Only approved deal submissions can be edited");
  }

  const updated = await updateDealByCreator({
    id,
    createdBy: userId,
    payload: {
      title: payload.title,
      description: payload.description || "",
      city_id: payload.city_id,
      category_id: payload.category_id,
      provider_name: payload.provider_name || "",
      original_price: null,
      discounted_price: null,
      expiry_date: payload.expiry_date,
      deal_link: payload.deal_link || "",
      promo_code: payload.promo_code || "",
      image_url: payload.image_url || "",
      is_premium: payload.is_premium === true || payload.is_premium === 1 ? 1 : 0,
      offer_type: null,
      offer_meta_json: null,
      terms_text: payload.terms_text || ""
    }
  });
  if (!updated) {
    throw new ApiError(400, "No valid fields provided for update");
  }

  await createAdminNotification({
    type: "deal_submitted",
    entityType: "deal",
    entityId: id,
    title: "Deal updated",
    message: `Deal #${id} was updated and is awaiting moderation.`
  });
}

async function trackDealClick(dealId) {
  return incrementDealPopularity({ dealId, delta: 1, clickDelta: 1, viewDelta: 0 });
}

async function trackDealView(dealId) {
  return incrementDealPopularity({ dealId, delta: 2, clickDelta: 0, viewDelta: 1 });
}

module.exports = {
  fetchDeals,
  fetchDealById,
  submitDeal,
  fetchMyDealSubmissions,
  editOwnDealSubmission,
  trackDealClick,
  trackDealView
};
