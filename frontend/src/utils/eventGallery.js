import { parsePromoVideoUrls, youtubeEmbedUrl, youtubeThumbnailUrl } from "./youtubeVideo";

/**
 * Ordered unique image URLs for event hero: primary `image_url` first, then `gallery_image_urls`.
 */
export function parseGalleryImageUrls(value) {
  if (!value) {
    return [];
  }
  if (Array.isArray(value)) {
    return value.map((u) => String(u || "").trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed)
        ? parsed.map((u) => String(u || "").trim()).filter(Boolean)
        : [];
    } catch (_err) {
      return [];
    }
  }
  return [];
}

export function collectEventGalleryUrls(event) {
  if (!event) {
    return [];
  }
  const seen = new Set();
  const out = [];
  const push = (u) => {
    const s = String(u || "").trim();
    if (!s || seen.has(s)) {
      return;
    }
    seen.add(s);
    out.push(s);
  };
  push(event.image_url);
  parseGalleryImageUrls(event.gallery_image_urls).forEach(push);
  return out;
}

/**
 * Banner carousel slides: cover/gallery images first, then YouTube promo videos.
 * @returns {Array<{ type: 'image', src: string } | { type: 'video', watchUrl: string, embedUrl: string, thumbnail: string }>}
 */
export function collectEventBannerSlides(event, { promoVideos } = {}) {
  const slides = [];
  collectEventGalleryUrls(event).forEach((src) => {
    slides.push({ type: "image", src });
  });

  const videos = Array.isArray(promoVideos) ? promoVideos : parsePromoVideoUrls(event?.promo_video_urls);
  for (const watchUrl of videos) {
    const embedUrl = youtubeEmbedUrl(watchUrl);
    const thumbnail = youtubeThumbnailUrl(watchUrl);
    if (!embedUrl || !thumbnail) {
      continue;
    }
    slides.push({ type: "video", watchUrl, embedUrl, thumbnail });
  }
  return slides;
}
