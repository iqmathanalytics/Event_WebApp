export const MAX_PROMO_VIDEOS = 6;

export function extractYoutubeVideoId(raw) {
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
    if (host === "youtube.com" || host === "m.youtube.com") {
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
    }
  } catch (_err) {
    return null;
  }
  return null;
}

export function normalizeYoutubePromoUrl(raw) {
  const id = extractYoutubeVideoId(raw);
  if (!id) {
    return null;
  }
  return `https://www.youtube.com/watch?v=${id}`;
}

export function parsePromoVideoUrls(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    const seen = new Set();
    const out = [];
    for (const row of value) {
      const normalized = normalizeYoutubePromoUrl(row);
      if (!normalized || seen.has(normalized)) {
        continue;
      }
      seen.add(normalized);
      out.push(normalized);
      if (out.length >= MAX_PROMO_VIDEOS) {
        break;
      }
    }
    return out;
  }
  if (typeof value === "string") {
    try {
      return parsePromoVideoUrls(JSON.parse(value));
    } catch (_err) {
      return parsePromoVideoUrls(
        String(value)
          .split(/[\n,]+/)
          .map((line) => line.trim())
          .filter(Boolean)
      );
    }
  }
  return [];
}

/** Lenient parse for admin forms — keeps submitted strings even if YouTube normalization fails. */
export function parsePromoVideoUrlsForForm(value) {
  if (!value) {
    return [];
  }
  const rawRows = [];
  if (Array.isArray(value)) {
    rawRows.push(...value);
  } else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        rawRows.push(...parsed);
      } else {
        rawRows.push(value);
      }
    } catch (_err) {
      rawRows.push(
        ...String(value)
          .split(/[\n,]+/)
          .map((line) => line.trim())
          .filter(Boolean)
      );
    }
  }
  const seen = new Set();
  const out = [];
  for (const row of rawRows) {
    const trimmed = String(row || "").trim();
    if (!trimmed) {
      continue;
    }
    const normalized = normalizeYoutubePromoUrl(trimmed) || trimmed;
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

export function youtubeEmbedUrl(watchUrl, { autoplay = false } = {}) {
  const id = extractYoutubeVideoId(watchUrl);
  if (!id) {
    return "";
  }
  const params = new URLSearchParams({
    rel: "0",
    modestbranding: "1"
  });
  if (autoplay) {
    params.set("autoplay", "1");
  }
  return `https://www.youtube.com/embed/${id}?${params.toString()}`;
}

export function youtubeThumbnailUrl(watchUrl) {
  const id = extractYoutubeVideoId(watchUrl);
  if (!id) {
    return "";
  }
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}
