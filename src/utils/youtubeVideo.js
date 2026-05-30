const MAX_PROMO_VIDEOS = 6;

function extractYoutubeVideoId(raw) {
  const input = String(raw || "").trim();
  if (!input) {
    return null;
  }
  const withProto = /^https?:\/\//i.test(input) ? input : `https://${input}`;
  try {
    const u = new URL(withProto);
    const host = u.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = u.pathname.replace(/^\/+/, "").split("/")[0];
      return id && /^[\w-]{6,}$/.test(id) ? id : null;
    }
    if (host === "youtube.com" || host === "m.youtube.com" || host === "music.youtube.com") {
      if (u.pathname === "/watch") {
        const id = u.searchParams.get("v");
        return id && /^[\w-]{6,}$/.test(id) ? id : null;
      }
      const parts = u.pathname.split("/").filter(Boolean);
      if (parts[0] === "embed" && parts[1]) {
        return /^[\w-]{6,}$/.test(parts[1]) ? parts[1] : null;
      }
      if (parts[0] === "shorts" && parts[1]) {
        return /^[\w-]{6,}$/.test(parts[1]) ? parts[1] : null;
      }
      if (parts[0] === "live" && parts[1]) {
        return /^[\w-]{6,}$/.test(parts[1]) ? parts[1] : null;
      }
      if (parts[0] === "v" && parts[1]) {
        return /^[\w-]{6,}$/.test(parts[1]) ? parts[1] : null;
      }
    }
  } catch (_err) {
    return null;
  }
  return null;
}

function normalizeYoutubePromoUrl(raw) {
  const id = extractYoutubeVideoId(raw);
  if (!id) {
    return null;
  }
  return `https://www.youtube.com/watch?v=${id}`;
}

function coalesceRawPromoRows(value) {
  if (value == null || value === "") {
    return [];
  }
  if (Buffer.isBuffer(value)) {
    return coalesceRawPromoRows(value.toString("utf8"));
  }
  if (typeof value === "string") {
    try {
      return coalesceRawPromoRows(JSON.parse(value));
    } catch (_err) {
      return String(value)
        .split(/[\n,]+/)
        .map((line) => line.trim())
        .filter(Boolean);
    }
  }
  if (Array.isArray(value)) {
    const out = [];
    for (const row of value) {
      if (typeof row === "string") {
        const trimmed = row.trim();
        if (trimmed) {
          out.push(trimmed);
        }
      } else if (row != null) {
        out.push(String(row).trim());
      }
    }
    return out.filter(Boolean);
  }
  if (typeof value === "object") {
    return coalesceRawPromoRows(Object.values(value));
  }
  return [];
}

function serializePromoVideoUrlsForStorage(value) {
  const seen = new Set();
  const out = [];
  for (const row of coalesceRawPromoRows(value)) {
    const normalized = normalizeYoutubePromoUrl(row) || String(row || "").trim();
    if (!normalized) {
      continue;
    }
    const key = normalized.toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    out.push(normalized);
    if (out.length >= MAX_PROMO_VIDEOS) {
      break;
    }
  }
  return out;
}

function parsePromoVideoUrls(value) {
  return serializePromoVideoUrlsForStorage(value);
}

const { toJsonDbString } = require("./jsonDb");

function promoVideoUrlsDbValue(value) {
  const urls = serializePromoVideoUrlsForStorage(value);
  return urls.length ? toJsonDbString(urls) : null;
}

function youtubeEmbedUrl(watchUrl) {
  const id = extractYoutubeVideoId(watchUrl);
  if (!id) {
    return "";
  }
  return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1`;
}

module.exports = {
  MAX_PROMO_VIDEOS,
  extractYoutubeVideoId,
  normalizeYoutubePromoUrl,
  coalesceRawPromoRows,
  serializePromoVideoUrlsForStorage,
  parsePromoVideoUrls,
  promoVideoUrlsDbValue,
  youtubeEmbedUrl
};
