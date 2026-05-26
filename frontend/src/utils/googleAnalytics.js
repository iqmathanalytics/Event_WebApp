const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim() || "";

let initialized = false;

function ensureGtag() {
  if (typeof window === "undefined" || !MEASUREMENT_ID) {
    return false;
  }
  if (initialized) {
    return true;
  }

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${MEASUREMENT_ID}`;
  document.head.appendChild(script);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;
  gtag("js", new Date());
  gtag("config", MEASUREMENT_ID, { send_page_view: false });

  initialized = true;
  return true;
}

export function isGoogleAnalyticsEnabled() {
  return Boolean(MEASUREMENT_ID);
}

export function initGoogleAnalytics() {
  return ensureGtag();
}

export function trackEventPageView({ eventId, eventTitle, ticketMode }) {
  if (!ensureGtag() || !eventId) {
    return;
  }
  const title = String(eventTitle || "").trim() || document.title;
  const pagePath = window.location.pathname;

  if (title && typeof document !== "undefined") {
    document.title = title.includes("Book My Tickets") ? title : `${title} | Book My Tickets`;
  }

  window.gtag("config", MEASUREMENT_ID, {
    page_title: title,
    page_path: pagePath
  });
  window.gtag("event", "page_view", {
    page_title: title,
    page_location: window.location.href,
    page_path: pagePath,
    bmt_event_id: String(eventId),
    bmt_ticket_mode: ticketMode || undefined
  });
}

/** Card or listing click — opens the event page (View Details). */
export function trackEventListingClick({ eventId }) {
  if (!ensureGtag() || !eventId) {
    return;
  }
  window.gtag("event", "bmt_event_click", {
    bmt_event_id: String(eventId)
  });
}

export function trackEventTicketClick({ eventId, clickType = "ticket" }) {
  if (!ensureGtag() || !eventId) {
    return;
  }
  const name = clickType === "external" ? "bmt_external_click" : "bmt_ticket_click";
  window.gtag("event", name, {
    bmt_event_id: String(eventId)
  });
}

/** Fired when a guest adds or increases a ticket tier in the cart (checkout). */
export function trackTicketTierCart({ eventId, levelId, levelName, tierKey, quantity }) {
  if (!ensureGtag() || !eventId || !levelId) {
    return;
  }
  window.gtag("event", "bmt_ticket_tier_add", {
    bmt_event_id: String(eventId),
    bmt_ticket_level_id: String(levelId),
    bmt_ticket_level_name: String(levelName || "").slice(0, 120),
    bmt_ticket_tier_key: tierKey || "standard",
    quantity: Math.max(1, Number(quantity) || 1)
  });
}

/** Fired when checkout completes with tier line items. */
export function trackBookingCompleteTiers({ eventId, items = [] }) {
  if (!ensureGtag() || !eventId || !items.length) {
    return;
  }
  window.gtag("event", "bmt_booking_complete", {
    bmt_event_id: String(eventId),
    bmt_ticket_tier_count: items.length,
    bmt_ticket_total_qty: items.reduce((s, r) => s + (Number(r.quantity) || 0), 0)
  });
  items.forEach((row) => {
    window.gtag("event", "bmt_booking_tier_line", {
      bmt_event_id: String(eventId),
      bmt_ticket_level_id: String(row.level_id || ""),
      bmt_ticket_level_name: String(row.level_name || "").slice(0, 120),
      quantity: Number(row.quantity) || 0
    });
  });
}
