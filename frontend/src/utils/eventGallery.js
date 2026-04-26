/**
 * Ordered unique image URLs for event hero: primary `image_url` first, then `gallery_image_urls`.
 */
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
  const extra = Array.isArray(event.gallery_image_urls) ? event.gallery_image_urls : [];
  extra.forEach(push);
  return out;
}
