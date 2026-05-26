function slugifyText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180);
}

export function encodePublicListingParam(param) {
  return encodeURIComponent(String(param ?? ""));
}

export function buildListingPublicSlug(titleOrName, id) {
  const base = slugifyText(titleOrName) || "listing";
  const numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId <= 0) {
    return base.slice(0, 200);
  }
  const suffix = `-${numericId}`;
  const maxBase = Math.max(1, 200 - suffix.length);
  return `${base.slice(0, maxBase)}${suffix}`;
}

export function eventDetailPath(event) {
  if (!event) {
    return "/events";
  }
  const slug = event.public_slug || event.publicSlug;
  if (slug) {
    return `/events/${slug}`;
  }
  return `/events/${buildListingPublicSlug(event.title, event.id)}`;
}

export function dealDetailPath(deal) {
  if (!deal) {
    return "/deals";
  }
  const slug = deal.public_slug || deal.publicSlug;
  if (slug) {
    return `/deals/${slug}`;
  }
  return `/deals/${buildListingPublicSlug(deal.title, deal.id)}`;
}

/** Full shareable URL for the current site (client-side). */
export function absoluteListingUrl(path) {
  const normalized = path?.startsWith("/") ? path : `/${path || ""}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${normalized}`;
  }
  return normalized;
}

export function influencerDetailPath(influencer) {
  if (!influencer) {
    return "/influencers";
  }
  const slug = influencer.public_slug || influencer.publicSlug;
  if (slug) {
    return `/influencers/${slug}`;
  }
  return `/influencers/${buildListingPublicSlug(influencer.name, influencer.id)}`;
}
