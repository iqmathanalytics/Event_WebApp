const CLOUDINARY_UPLOAD = /^(https?:\/\/res\.cloudinary\.com\/[^/]+\/(?:image|images)\/upload\/)(.+)$/i;
const OUR_TRANSFORM_PREFIX = /^f_auto,q_auto(?:,[A-Za-z0-9_:,.]+)?\//;

function trimUrl(url) {
  return String(url || "").trim();
}

export function isCloudinaryUrl(url) {
  try {
    const host = new URL(trimUrl(url)).hostname.toLowerCase();
    return host === "res.cloudinary.com" || host.endsWith(".cloudinary.com");
  } catch {
    return false;
  }
}

export function isUnsplashUrl(url) {
  try {
    const host = new URL(trimUrl(url)).hostname.toLowerCase();
    return host === "images.unsplash.com" || host === "plus.unsplash.com" || host.endsWith(".unsplash.com");
  } catch {
    return false;
  }
}

function withCloudinaryTransform(url, transform) {
  const raw = trimUrl(url);
  const match = raw.match(CLOUDINARY_UPLOAD);
  if (!match) {
    return raw;
  }
  const rest = match[2].replace(OUR_TRANSFORM_PREFIX, "");
  return `${match[1]}${transform}/${rest}`;
}

function withUnsplashParams(url, { width, quality = 75 } = {}) {
  const raw = trimUrl(url);
  try {
    const parsed = new URL(raw);
    if (width) {
      parsed.searchParams.set("w", String(width));
    }
    parsed.searchParams.set("q", String(quality));
    parsed.searchParams.set("auto", "format");
    parsed.searchParams.set("fit", parsed.searchParams.get("fit") || "crop");
    return parsed.toString();
  } catch {
    return raw;
  }
}

/** Resize without cropping. Safe default for CSS object-fit. */
export function displayImageUrl(url, width = 800) {
  const raw = trimUrl(url);
  if (!raw) {
    return raw;
  }
  if (isCloudinaryUrl(raw)) {
    return withCloudinaryTransform(raw, `f_auto,q_auto,c_limit,w_${width}`);
  }
  if (isUnsplashUrl(raw)) {
    return withUnsplashParams(raw, { width });
  }
  return raw;
}

export function displayImageSrcSet(url, widths = [480, 800, 1200]) {
  const raw = trimUrl(url);
  if (!raw || (!isCloudinaryUrl(raw) && !isUnsplashUrl(raw))) {
    return undefined;
  }
  return widths.map((width) => `${displayImageUrl(raw, width)} ${width}w`).join(", ");
}

export function displayImageBlurUrl(url) {
  const raw = trimUrl(url);
  if (!raw) {
    return raw;
  }
  if (isCloudinaryUrl(raw)) {
    return withCloudinaryTransform(raw, "f_auto,q_auto,c_fill,w_40,h_40,e_blur:400");
  }
  if (isUnsplashUrl(raw)) {
    return withUnsplashParams(raw, { width: 32, quality: 30 });
  }
  return raw;
}

export function listingCardImageUrl(url) {
  return displayImageUrl(url, 800);
}

export function listingCardSrcSet(url) {
  return displayImageSrcSet(url, [480, 800, 1200]);
}

export function listingBannerImageUrl(url) {
  return displayImageUrl(url, 1400);
}

export function listingBannerSrcSet(url) {
  return displayImageSrcSet(url, [800, 1400, 1800]);
}

export function heroImageUrl(url) {
  return displayImageUrl(url, 1280);
}

export function heroImageSrcSet(url) {
  return displayImageSrcSet(url, [800, 1280, 1600]);
}

export function thumbImageUrl(url) {
  return displayImageUrl(url, 160);
}

export const LISTING_CARD_SIZES = "(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 33vw";
export const HOME_CARD_SIZES = "(max-width: 1023px) 100vw, 33vw";
export const LISTING_BANNER_SIZES = "100vw";
export const HERO_IMAGE_SIZES = "(max-width: 1024px) 100vw, 56vw";
