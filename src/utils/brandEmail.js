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

module.exports = {
  BRAND_NAME,
  BRAND_TAGLINE,
  BRAND_SUPPORT_EMAIL,
  appBaseUrl,
  brandLogoEmailUrl,
  dashboardUrl,
  eventDetailUrl
};
