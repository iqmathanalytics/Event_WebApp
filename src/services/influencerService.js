const ApiError = require("../utils/ApiError");
const { pool } = require("../config/db");
const { createAdminNotification } = require("../models/adminModel");
const {
  listInfluencers,
  createInfluencer,
  listInfluencersByCreator,
  findPendingInfluencerByCreator,
  findAnyInfluencerByCreator,
  findInfluencerById,
  updateInfluencerByCreator,
  fetchInfluencerDetailsById,
  incrementInfluencerView,
  incrementInfluencerClick,
  fetchInfluencerGallery,
  addInfluencerGalleryImages
} = require("../models/influencerModel");
const { getDateRange, getMonthRange } = require("../utils/dateRange");

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseMaybeJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch (_err) {
    return null;
  }
}

function attachDynamicInfluencerTags(influencer) {
  const tags = [];

  const audienceTotal = toNumber(influencer.audience_total || influencer.followers_count + influencer.youtube_subscribers_count);
  const totalEngagement = toNumber(influencer.total_engagement || 0);
  const recentEngagement = toNumber(influencer.recent_engagement_score || 0);

  const isVerified = influencer.is_verified === 1 || influencer.is_verified === true;

  // Thresholds tuned for your app’s scale (adjust later if needed).
  const TAG_RULES = {
    trendingMinRecentEngagement: 20,
    popularMinAudienceTotal: 1000,
    risingMinRecentRate: 0.25,
    topCreatorMinAudienceTotal: 5000
  };

  // Trending: strong recent engagement activity.
  if (recentEngagement >= TAG_RULES.trendingMinRecentEngagement) {
    tags.push("Trending");
  }

  // Popular: strong audience size.
  if (audienceTotal >= TAG_RULES.popularMinAudienceTotal) {
    tags.push("Popular");
  }

  // Rising: recent engagement is a high portion of total engagement.
  if (totalEngagement > 0 && recentEngagement / totalEngagement >= TAG_RULES.risingMinRecentRate) {
    tags.push("Rising");
  }

  // Top Creator: verified/admin-confirmed or very high audience.
  if (isVerified || audienceTotal >= TAG_RULES.topCreatorMinAudienceTotal) {
    tags.push("Top Creator");
  }

  return {
    ...influencer,
    tags
  };
}

async function fetchInfluencers(query) {
  const { dateStart, dateEnd } = getDateRange(query.date || null);
  const { monthStart, monthEnd } = getMonthRange(query.month || null);
  const rows = await listInfluencers({
    cityId: query.city ? Number(query.city) : null,
    categoryId: query.category ? Number(query.category) : null,
    dateStart,
    dateEnd,
    monthStart,
    monthEnd,
    q: query.q || query.search || null,
    sortBy: query.sort || "popularity"
  });
  return rows.map((row) => attachDynamicInfluencerTags(row));
}

async function getYoutubeSubscriberCountFromUrl(youtubeUrl) {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return null;
  }

  if (!youtubeUrl) {
    return null;
  }

  // Resolve channelId from various YouTube URL shapes.
  const resolveChannelId = async () => {
    try {
      const u = new URL(youtubeUrl);
      const host = u.hostname.toLowerCase();

      // youtube.com/channel/CHANNEL_ID
      const channelMatch = u.pathname.match(/\/channel\/([^/]+)/i);
      if (channelMatch?.[1]) return channelMatch[1];

      // youtube.com/@handle
      const handleMatch = u.pathname.match(/\/@([^/?#]+)/i);
      if (handleMatch?.[1]) {
        const handle = handleMatch[1];
        const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${encodeURIComponent(
          handle
        )}&maxResults=1&key=${apiKey}`;
        const r = await fetch(searchUrl);
        const data = await r.json();
        return data?.items?.[0]?.id?.channelId || null;
      }

      // youtu.be/VIDEO_ID or youtube.com/watch?v=VIDEO_ID
      const videoMatch = host.includes("youtu.be") ? u.pathname.match(/^\/([^/?#]+)/) : null;
      const videoId = videoMatch?.[1] || u.searchParams.get("v");

      if (videoId) {
        const videosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet&id=${encodeURIComponent(
          videoId
        )}&key=${apiKey}`;
        const r = await fetch(videosUrl);
        const data = await r.json();
        return data?.items?.[0]?.snippet?.channelId || null;
      }
    } catch (_err) {
      // fallthrough to return null
    }

    return null;
  };

  const channelId = await resolveChannelId();
  if (!channelId) {
    return null;
  }

  const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(
    channelId
  )}&key=${apiKey}`;
  const r = await fetch(channelsUrl);
  const data = await r.json();
  const subscriberCount = data?.items?.[0]?.statistics?.subscriberCount;
  return subscriberCount != null ? Number(subscriberCount) : null;
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

  const followers_count = toNumber(payload.instagram_followers_count);
  const youtube_subscribers_count = payload.youtube_subscribers_count != null ? toNumber(payload.youtube_subscribers_count) : 0;

  let computedYoutubeSubs = youtube_subscribers_count;
  try {
    const maybe = await getYoutubeSubscriberCountFromUrl(payload.youtube);
    if (maybe != null) computedYoutubeSubs = toNumber(maybe);
  } catch (_err) {
    // If YouTube fetch fails, keep computedYoutubeSubs (defaults to 0).
  }

  try {
    const influencerId = await createInfluencer({
      name: payload.name,
      bio: payload.bio || "",
      city_id: payload.city_id,
      category_id: payload.category_id,
      social_links,
      followers_count,
      youtube_subscribers_count: computedYoutubeSubs,
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

  const followers_count = payload.instagram_followers_count != null ? toNumber(payload.instagram_followers_count) : toNumber(existing.followers_count);

  let youtube_subscribers_count = toNumber(existing.youtube_subscribers_count);
  const existingSocial = parseMaybeJson(existing.social_links) || {};
  const youtubeChanged = String(existingSocial.youtube || "") !== String(payload.youtube || "");
  if (youtubeChanged) {
    try {
      const maybe = await getYoutubeSubscriberCountFromUrl(payload.youtube);
      if (maybe != null) youtube_subscribers_count = toNumber(maybe);
    } catch (_err) {
      // keep existing count
    }
  }

  const updated = await updateInfluencerByCreator({
    id,
    createdBy: userId,
    payload: {
      name: payload.name,
      bio: payload.bio,
      city_id: payload.city_id,
      category_id: payload.category_id,
      social_links,
      followers_count,
      youtube_subscribers_count,
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

async function fetchInfluencerById(id) {
  const row = await fetchInfluencerDetailsById(id);
  if (!row) {
    throw new ApiError(404, "Influencer not found");
  }

  // Ensure tags exist for details page.
  return attachDynamicInfluencerTags(row);
}

async function trackInfluencerView(id) {
  const ok = await incrementInfluencerView(id);
  if (!ok) {
    throw new ApiError(404, "Influencer not found");
  }
  return { success: true };
}

async function trackInfluencerClick(id) {
  const ok = await incrementInfluencerClick(id);
  if (!ok) {
    throw new ApiError(404, "Influencer not found");
  }
  return { success: true };
}

async function uploadInfluencerGallery({ influencerId, imageUrls, userId }) {
  const influencer = await findInfluencerById(influencerId);
  if (!influencer) {
    throw new ApiError(404, "Influencer not found");
  }
  if (Number(influencer.created_by) !== Number(userId)) {
    throw new ApiError(403, "You can only upload your own influencer gallery");
  }
  const ok = await addInfluencerGalleryImages({ influencerId, imageUrls });
  if (!ok) {
    throw new ApiError(400, "No valid images provided");
  }
  return { success: true };
}

async function fetchInfluencerGalleryById(influencerId) {
  return fetchInfluencerGallery(influencerId);
}

function startYoutubeSubscriberRefreshJob() {
  if (global.__influencerYoutubeRefreshJobStarted) {
    return;
  }
  global.__influencerYoutubeRefreshJobStarted = true;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return;
  }

  const intervalMs = Number(process.env.YOUTUBE_REFRESH_INTERVAL_MS || 6 * 60 * 60 * 1000); // 6 hours
  const maxPerRun = Number(process.env.YOUTUBE_REFRESH_MAX_PER_RUN || 5);

  const run = async () => {
    try {
      const [rows] = await pool.query(
        `SELECT id, social_links
         FROM influencers
         WHERE status = 'approved'
           AND JSON_EXTRACT(social_links, '$.youtube') IS NOT NULL
           AND JSON_UNQUOTE(JSON_EXTRACT(social_links, '$.youtube')) <> ''
         ORDER BY (COALESCE(followers_count,0) + COALESCE(youtube_subscribers_count,0)) DESC
         LIMIT ?`,
        [maxPerRun]
      );

      for (const row of rows) {
        const socialLinks = parseMaybeJson(row.social_links) || {};
        const youtubeUrl = socialLinks.youtube;
        if (!youtubeUrl) continue;
        const subs = await getYoutubeSubscriberCountFromUrl(youtubeUrl);
        if (subs == null) continue;
        await pool.query(`UPDATE influencers SET youtube_subscribers_count = ? WHERE id = ?`, [
          toNumber(subs),
          row.id
        ]);
      }
    } catch (_err) {
      // Keep the job resilient.
    }
  };

  // Run once quickly after startup.
  run().catch(() => {});

  setInterval(() => {
    run().catch(() => {});
  }, intervalMs);
}

module.exports = {
  fetchInfluencers,
  submitInfluencer,
  fetchMyInfluencerSubmissions,
  editOwnInfluencerSubmission,
  fetchInfluencerById,
  trackInfluencerView,
  trackInfluencerClick,
  uploadInfluencerGallery,
  fetchInfluencerGalleryById,
  startYoutubeSubscriberRefreshJob
};
