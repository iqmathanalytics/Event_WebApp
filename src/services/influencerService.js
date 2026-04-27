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
const SOCIAL_SCRAPER_UA = "Mozilla/5.0";

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

function extractInstagramHandle(instagramUrl) {
  const raw = String(instagramUrl || "").trim();
  if (!raw) {
    return "";
  }

  try {
    const withProto = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const u = new URL(withProto);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "instagram.com") {
      return "";
    }
    const firstPath = u.pathname.replace(/^\/+/, "").split("/")[0];
    return String(firstPath || "").replace(/^@/, "").trim();
  } catch (_err) {
    return "";
  }
}

function normalizeFacebookPageUrl(facebookUrl) {
  const raw = String(facebookUrl || "").trim();
  if (!raw) return "";
  const hasProto = /^https?:\/\//i.test(raw);
  const asUrl = hasProto ? raw : `https://${raw}`;
  try {
    const u = new URL(asUrl);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host !== "facebook.com" && host !== "m.facebook.com") return "";
    const firstPath = u.pathname.replace(/^\/+/, "").split("/")[0];
    if (!firstPath) return "";
    if (firstPath.toLowerCase() === "profile.php") {
      const profileId = u.searchParams.get("id");
      if (!profileId) return "";
      return `https://www.facebook.com/profile.php?id=${encodeURIComponent(profileId)}`;
    }
    return `https://www.facebook.com/${firstPath}/`;
  } catch (_err) {
    return "";
  }
}

function decodeHtmlEntities(text) {
  return String(text || "")
    .replace(/&#(\d+);/g, (_m, dec) => String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

async function getFacebookFollowerCountFromUrl(facebookUrl) {
  const normalized = normalizeFacebookPageUrl(facebookUrl);
  if (!normalized) return null;
  try {
    const response = await fetch(normalized, {
      headers: {
        accept: "text/html",
        "user-agent": SOCIAL_SCRAPER_UA
      }
    });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();
    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const ogDesc = decodeHtmlEntities(ogDescMatch?.[1] || "");
    if (!ogDesc) return null;
    const firstNumber = ogDesc.match(/([\d][\d,.\s]*)/)?.[1];
    if (!firstNumber) return null;
    const normalizedDigits = firstNumber.replace(/[^\d]/g, "");
    if (!normalizedDigits) return null;
    return toNumber(normalizedDigits);
  } catch (_err) {
    return null;
  }
}

async function resolveInfluencerSocialMetrics(
  { instagram = "", facebook = "", youtube = "" },
  {
    fallbackInstagramFollowers = 0,
    fallbackFacebookFollowers = 0,
    fallbackYoutubeSubscribers = 0
  } = {}
) {
  let instagramFollowers = toNumber(fallbackInstagramFollowers);
  let facebookFollowers = toNumber(fallbackFacebookFollowers);
  let youtubeSubscribers = toNumber(fallbackYoutubeSubscribers);

  try {
    const maybe = await getInstagramFollowerCountFromUrl(instagram);
    if (maybe != null) instagramFollowers = toNumber(maybe);
  } catch (_err) {
    // Keep fallback.
  }

  try {
    const maybe = await getFacebookFollowerCountFromUrl(facebook);
    if (maybe != null) facebookFollowers = toNumber(maybe);
  } catch (_err) {
    // Keep fallback.
  }

  try {
    const maybe = await getYoutubeSubscriberCountFromUrl(youtube);
    if (maybe != null) youtubeSubscribers = toNumber(maybe);
  } catch (_err) {
    // Keep fallback.
  }

  return {
    followers_count: instagramFollowers,
    facebook_followers_count: facebookFollowers,
    youtube_subscribers_count: youtubeSubscribers
  };
}

async function getInstagramFollowerCountFromUrl(instagramUrl) {
  const username = extractInstagramHandle(instagramUrl);
  if (!username) {
    return null;
  }

  // Primary source: Instagram web profile info endpoint.
  try {
    const apiUrl = `https://i.instagram.com/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`;
    const response = await fetch(apiUrl, {
      headers: {
        "x-ig-app-id": "936619743392459",
        accept: "application/json",
        "user-agent": SOCIAL_SCRAPER_UA
      }
    });
    if (response.ok) {
      const data = await response.json();
      const count = data?.data?.user?.edge_followed_by?.count;
      if (count != null && Number.isFinite(Number(count))) {
        return toNumber(count);
      }
    }
  } catch (_err) {
    // Fall through to HTML parsing fallback.
  }

  // Secondary source: Instagram profile embed payload (contextJSON).
  try {
    const embedUrl = `https://www.instagram.com/${encodeURIComponent(username)}/embed`;
    const response = await fetch(embedUrl, {
      headers: {
        accept: "text/html",
        "user-agent": SOCIAL_SCRAPER_UA
      }
    });
    if (response.ok) {
      const html = await response.text();
      const match =
        html.match(/followers_count[^0-9]*(\d+)/i) ||
        html.match(/edge_followed_by[^0-9]*(\d+)/i) ||
        html.match(/\\?"edge_followed_by\\?"\s*:\s*\{\s*\\?"count\\?"\s*:\s*(\d+)/i);
      if (match?.[1]) {
        return toNumber(match[1]);
      }
    }
  } catch (_err) {
    // Fall through to profile HTML parsing fallback.
  }

  // Fallback source: parse public profile HTML metadata.
  try {
    const profileUrl = `https://www.instagram.com/${encodeURIComponent(username)}/`;
    const response = await fetch(profileUrl, {
      headers: {
        accept: "text/html",
        "user-agent": SOCIAL_SCRAPER_UA
      }
    });
    if (!response.ok) {
      return null;
    }
    const html = await response.text();

    const directMatch = html.match(/"edge_followed_by"\s*:\s*\{\s*"count"\s*:\s*(\d+)\s*\}/i);
    if (directMatch?.[1]) {
      return toNumber(directMatch[1]);
    }

    const ogDescMatch = html.match(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i);
    const ogDesc = ogDescMatch?.[1] || "";
    const numberToken = ogDesc.match(/([\d.,]+)\s+Followers/i)?.[1];
    if (numberToken) {
      const normalized = numberToken.replace(/[.,](?=\d{3}\b)/g, "").replace(/[^\d]/g, "");
      if (normalized) {
        return toNumber(normalized);
      }
    }
  } catch (_err) {
    // Fall through to null if extraction fails.
  }

  return null;
}

function attachDynamicInfluencerTags(influencer) {
  const tags = [];

  const audienceTotal = toNumber(
    influencer.audience_total ||
      influencer.followers_count + influencer.facebook_followers_count + influencer.youtube_subscribers_count
  );
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
  if (apiKey && channelId) {
    const channelsUrl = `https://www.googleapis.com/youtube/v3/channels?part=statistics&id=${encodeURIComponent(
      channelId
    )}&key=${apiKey}`;
    const r = await fetch(channelsUrl);
    const data = await r.json();
    const subscriberCount = data?.items?.[0]?.statistics?.subscriberCount;
    if (subscriberCount != null) {
      return Number(subscriberCount);
    }
  }

  // Fallback without API key: parse subscriber text from public channel page.
  try {
    const withProto = /^https?:\/\//i.test(String(youtubeUrl)) ? String(youtubeUrl) : `https://${youtubeUrl}`;
    const channelRes = await fetch(withProto, {
      headers: {
        accept: "text/html",
        "user-agent": SOCIAL_SCRAPER_UA
      }
    });
    if (!channelRes.ok) return null;
    const html = await channelRes.text();
    const m =
      html.match(/"subscriberCountText"\s*:\s*\{\s*"simpleText"\s*:\s*"([^"]+)"/i) ||
      html.match(/([\d.,]+)\s*([KMB])?\s*subscribers/i);
    if (!m?.[1]) return null;
    const raw = String(m[1]).replace(/,/g, "").trim();
    const suffix = m[2] ? String(m[2]).toUpperCase() : "";
    const base = Number(raw);
    if (!Number.isFinite(base)) return null;
    if (suffix === "K") return Math.round(base * 1000);
    if (suffix === "M") return Math.round(base * 1000 * 1000);
    if (suffix === "B") return Math.round(base * 1000 * 1000 * 1000);
    return Math.round(base);
  } catch (_err) {
    return null;
  }
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
    facebook: payload.facebook || "",
    youtube: payload.youtube || ""
  };

  const socialMetrics = await resolveInfluencerSocialMetrics({
    instagram: payload.instagram,
    facebook: payload.facebook,
    youtube: payload.youtube
  });

  try {
    const influencerId = await createInfluencer({
      name: payload.name,
      bio: payload.bio || "",
      city_id: payload.city_id,
      category_id: payload.category_id,
      social_links,
      followers_count: socialMetrics.followers_count,
      facebook_followers_count: socialMetrics.facebook_followers_count,
      youtube_subscribers_count: socialMetrics.youtube_subscribers_count,
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
    facebook: payload.facebook || "",
    youtube: payload.youtube || ""
  };

  const existingSocial = parseMaybeJson(existing.social_links) || {};
  const socialMetrics = await resolveInfluencerSocialMetrics(
    {
      instagram: payload.instagram,
      facebook: payload.facebook,
      youtube: payload.youtube
    },
    {
      fallbackInstagramFollowers: 0,
      fallbackFacebookFollowers: 0,
      fallbackYoutubeSubscribers: 0
    }
  );

  const updated = await updateInfluencerByCreator({
    id,
    createdBy: userId,
    payload: {
      name: payload.name,
      bio: payload.bio,
      city_id: payload.city_id,
      category_id: payload.category_id,
      social_links,
      followers_count: socialMetrics.followers_count,
      facebook_followers_count: socialMetrics.facebook_followers_count,
      youtube_subscribers_count: socialMetrics.youtube_subscribers_count,
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
  const intervalMs = Number(process.env.YOUTUBE_REFRESH_INTERVAL_MS || 6 * 60 * 60 * 1000); // 6 hours
  const maxPerRun = Number(process.env.YOUTUBE_REFRESH_MAX_PER_RUN || 25);
  const instagramMaxPerRun = Number(process.env.INSTAGRAM_REFRESH_MAX_PER_RUN || 100);
  const facebookMaxPerRun = Number(process.env.FACEBOOK_REFRESH_MAX_PER_RUN || 100);

  const run = async () => {
    try {
      const [rows] = await pool.query(
        `SELECT id, social_links
         FROM influencers
         WHERE status = 'approved'
           AND (
             (
               JSON_EXTRACT(social_links, '$.instagram') IS NOT NULL
               AND JSON_UNQUOTE(JSON_EXTRACT(social_links, '$.instagram')) <> ''
             )
             OR (
               JSON_EXTRACT(social_links, '$.facebook') IS NOT NULL
               AND JSON_UNQUOTE(JSON_EXTRACT(social_links, '$.facebook')) <> ''
             )
             OR (
               JSON_EXTRACT(social_links, '$.youtube') IS NOT NULL
               AND JSON_UNQUOTE(JSON_EXTRACT(social_links, '$.youtube')) <> ''
             )
           )
         ORDER BY id ASC
         LIMIT ?`,
        [Math.max(maxPerRun, instagramMaxPerRun, facebookMaxPerRun)]
      );

      let instagramProcessed = 0;
      let facebookProcessed = 0;
      let youtubeProcessed = 0;

      for (const row of rows) {
        const socialLinks = parseMaybeJson(row.social_links) || {};

        const instagramUrl = socialLinks.instagram;
        if (instagramUrl && instagramProcessed < instagramMaxPerRun) {
          const followers = await getInstagramFollowerCountFromUrl(instagramUrl);
          if (followers != null) {
            await pool.query(`UPDATE influencers SET followers_count = ? WHERE id = ?`, [toNumber(followers), row.id]);
          }
          instagramProcessed += 1;
        }

        const youtubeUrl = socialLinks.youtube;
        if (apiKey && youtubeUrl && youtubeProcessed < maxPerRun) {
          const subs = await getYoutubeSubscriberCountFromUrl(youtubeUrl);
          if (subs != null) {
            await pool.query(`UPDATE influencers SET youtube_subscribers_count = ? WHERE id = ?`, [
              toNumber(subs),
              row.id
            ]);
          }
          youtubeProcessed += 1;
        }

        const facebookUrl = socialLinks.facebook;
        if (facebookUrl && facebookProcessed < facebookMaxPerRun) {
          const fbFollowers = await getFacebookFollowerCountFromUrl(facebookUrl);
          if (fbFollowers != null) {
            await pool.query(`UPDATE influencers SET facebook_followers_count = ? WHERE id = ?`, [
              toNumber(fbFollowers),
              row.id
            ]);
          }
          facebookProcessed += 1;
        }

        if (
          instagramProcessed >= instagramMaxPerRun &&
          facebookProcessed >= facebookMaxPerRun &&
          (!apiKey || youtubeProcessed >= maxPerRun)
        ) {
          break;
        }
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
  startYoutubeSubscriberRefreshJob,
  resolveInfluencerSocialMetrics
};
