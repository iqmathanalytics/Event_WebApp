/** Public product name */
export const BRAND_NAME = "Book My Tickets";

/** Events with member discount / gated details (`is_yay_deal_event`) */
export const EXCLUSIVE_DEAL_EVENT_LABEL = "Exclusive deal event";

/** Primary logo under `public/branding/` — filename may include spaces (URL-encoded). */
const BRAND_LOGO_FILENAME = "BMT2 RM.png";
export const BRAND_LOGO_URL = `/branding/${encodeURIComponent(BRAND_LOGO_FILENAME)}`;
