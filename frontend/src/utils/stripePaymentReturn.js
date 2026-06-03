const PENDING_PREFIX = "bmt_stripe_pending_v1";

function pendingKey(eventId, userId) {
  const userKey = userId === "guest" ? "guest" : Number(userId);
  return `${PENDING_PREFIX}_${Number(eventId)}_${userKey}`;
}

export function buildStripeReturnUrl(eventId) {
  const path = window.location.pathname || "/";
  const params = new URLSearchParams();
  params.set("payment_return", "1");
  params.set("event_id", String(eventId));
  return `${window.location.origin}${path}?${params.toString()}`;
}

export function savePendingStripePayment(eventId, userId, data) {
  if (eventId == null || userId == null) {
    return;
  }
  try {
    sessionStorage.setItem(
      pendingKey(eventId, userId),
      JSON.stringify({
        ...data,
        eventId: Number(eventId),
        userId: userId === "guest" ? "guest" : Number(userId),
        savedAt: Date.now()
      })
    );
  } catch {
    /* ignore */
  }
}

export function loadPendingStripePayment(eventId, userId) {
  if (eventId == null || userId == null) {
    return null;
  }
  try {
    const raw = sessionStorage.getItem(pendingKey(eventId, userId));
    if (!raw) {
      return null;
    }
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function clearPendingStripePayment(eventId, userId) {
  if (eventId == null || userId == null) {
    return;
  }
  try {
    sessionStorage.removeItem(pendingKey(eventId, userId));
  } catch {
    /* ignore */
  }
}

/** Stripe redirect query params after Cash App / Amazon Pay / etc. */
export function parseStripeReturnParams(search = "") {
  const params = new URLSearchParams(search || window.location.search);
  const paymentIntentId = params.get("payment_intent") || params.get("payment_intent_id") || null;
  const redirectStatus = params.get("redirect_status") || null;
  const clientSecret = params.get("payment_intent_client_secret") || null;
  const isPaymentReturn =
    params.get("payment_return") === "1" ||
    Boolean(paymentIntentId && redirectStatus) ||
    Boolean(paymentIntentId && clientSecret);

  return {
    isPaymentReturn,
    paymentIntentId,
    redirectStatus,
    clientSecret,
    eventIdFromUrl: params.get("event_id") ? Number(params.get("event_id")) : null
  };
}

export function clearStripeReturnParams() {
  if (typeof window === "undefined") {
    return;
  }
  const url = new URL(window.location.href);
  const strip = [
    "payment_return",
    "event_id",
    "payment_intent",
    "payment_intent_client_secret",
    "redirect_status",
    "redirect_status_source"
  ];
  strip.forEach((key) => url.searchParams.delete(key));
  const next = `${url.pathname}${url.search}${url.hash}`;
  window.history.replaceState({}, "", next || url.pathname);
}

export const STRIPE_PAYMENT_MESSAGE = "BMT_STRIPE_PAYMENT_RETURN";
