/** Public product name */
export const BRAND_NAME = "Book My Tickets";

/** Events with member discount / gated details (`is_yay_deal_event`) */
export const EXCLUSIVE_DEAL_EVENT_LABEL = "Exclusive deal event";

/** Splash, auth, route loading, and logo-flight handoff (`public/branding/`). */
const BRAND_LOGO_FILENAME = "BMT2 RM.png";
export const BRAND_LOGO_URL = `/branding/${encodeURIComponent(BRAND_LOGO_FILENAME)}`;

/** Sticky navbar mark only — splash / auth keep `BRAND_LOGO_URL`. */
const BRAND_HEADER_LOGO_FILENAME = "BMT2 New.png";
export const BRAND_HEADER_LOGO_URL = `/branding/${encodeURIComponent(BRAND_HEADER_LOGO_FILENAME)}`;

/** Horizontal banner beside the mark in the sticky header (`public/branding/`). */
export const BRAND_BANNER_URL = "/branding/Banner.png";
