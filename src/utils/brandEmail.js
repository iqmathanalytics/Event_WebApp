const BRAND_NAME = "Book My Tickets";
const BRAND_TAGLINE = "Your city's event guide";
const BRAND_SUPPORT_EMAIL = "tickets@bookmytickets.us";

function appBaseUrl() {
  const raw = process.env.FRONTEND_URL || process.env.PUBLIC_APP_URL || "https://bookmytickets.us";
  return String(raw).replace(/\/$/, "");
}

function brandLogoEmailUrl() {
  return `${appBaseUrl()}/branding/${encodeURIComponent("BMT2 RM.png")}`;
}

function dashboardUrl(path = "") {
  const base = appBaseUrl();
  const p = String(path || "").trim();
  if (!p) {
    return base;
  }
  return `${base}${p.startsWith("/") ? p : `/${p}`}`;
}

function eventDetailUrl(event) {
  const { buildListingPublicSlug } = require("./listingSlug");
  const slug = event?.public_slug;
  const segment = slug || buildListingPublicSlug(event?.title, event?.id);
  return dashboardUrl(`/events/${segment}`);
}

/** Public API base for email image URLs (Brevo requires absolute https URLs, not data: or cid:). */
function publicApiBaseUrl() {
  const explicit = String(process.env.PUBLIC_API_URL || process.env.API_PUBLIC_BASE_URL || "").trim();
  if (explicit) {
    return explicit.replace(/\/$/, "");
  }
  if (process.env.NODE_ENV === "production") {
    return `${appBaseUrl()}/api`;
  }
  const port = Number(process.env.PORT) || 5000;
  return `http://localhost:${port}`;
}

module.exports = {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_SUPPORT_EMAIL,
  appBaseUrl,
  brandLogoEmailUrl,
  dashboardUrl,
  eventDetailUrl,
  publicApiBaseUrl
};
