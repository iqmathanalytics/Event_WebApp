import sampleEvent from "./configs/sample-event";

/** Slugs that must never resolve as event landings (collide with app routes). */
export const RESERVED_SLUGS = new Set([
  "events",
  "deals",
  "influencers",
  "login",
  "register",
  "set-password",
  "complete-signup",
  "dashboard",
  "admin",
  "api",
  "404",
  "about",
  "contact",
  "newsletter",
  "privacy",
  "terms",
  "refund",
  "organizer",
  "checkout",
  "payment",
  "profile",
  "favorites",
  "search",
  "auth",
  "oauth",
  "static",
  "assets",
  "favicon.ico",
]);

const LANDINGS = {
  [sampleEvent.slug]: sampleEvent,
};

export function getEventLandingConfig(slug) {
  if (!slug || typeof slug !== "string") return null;
  const key = slug.trim().toLowerCase();
  if (!key || RESERVED_SLUGS.has(key)) return null;
  return LANDINGS[key] || null;
}

export function isReservedEventSlug(slug) {
  if (!slug || typeof slug !== "string") return true;
  return RESERVED_SLUGS.has(slug.trim().toLowerCase());
}

export function listEventLandingSlugs() {
  return Object.keys(LANDINGS);
}
