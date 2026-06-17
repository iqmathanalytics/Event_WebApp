const STORAGE_PREFIX = "bmt_event_checkout_v1";

function storageKey(eventId, userId) {
  const userKey = userId === "guest" ? "guest" : Number(userId);
  return `${STORAGE_PREFIX}_${Number(eventId)}_${userKey}`;
}

export function parseExpiresMs(value) {
  if (!value) {
    return null;
  }
  let normalized = String(value).trim().replace(" ", "T");
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(normalized) && !/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized)) {
    normalized += "Z";
  }
  const t = new Date(normalized).getTime();
  return Number.isFinite(t) ? t : null;
}

function isHoldExpired(couponHold) {
  const expiresMs = parseExpiresMs(couponHold?.expiresAt);
  if (expiresMs == null) {
    return false;
  }
  return expiresMs <= Date.now();
}

export function isSeatHoldExpired(seatHold) {
  if (!seatHold?.holdToken) {
    return true;
  }
  const expiresMs =
    typeof seatHold.expiresAt === "number"
      ? seatHold.expiresAt
      : parseExpiresMs(seatHold.expiresAt);
  if (expiresMs == null) {
    return false;
  }
  return expiresMs <= Date.now();
}

export function loadEventCheckoutDraft(eventId, userId) {
  if (eventId == null || userId == null) {
    return null;
  }
  const key = storageKey(eventId, userId);
  try {
    const raw = sessionStorage.getItem(key) || localStorage.getItem(key);
    if (!raw) {
      return null;
    }
    const draft = JSON.parse(raw);
    const draftUserKey = draft.userId === "guest" ? "guest" : Number(draft.userId);
    const expectedUserKey = userId === "guest" ? "guest" : Number(userId);
    if (Number(draft.eventId) !== Number(eventId) || draftUserKey !== expectedUserKey) {
      return null;
    }
    if (draft.couponHold && isHoldExpired(draft.couponHold)) {
      draft.couponHold = null;
      draft.couponMessage = "";
      draft.holdSnapshot = null;
    }
    if (draft.seatHold && isSeatHoldExpired(draft.seatHold)) {
      draft.seatHold = null;
    }
    return draft;
  } catch {
    return null;
  }
}

export function saveEventCheckoutDraft(draft) {
  if (draft?.eventId == null || draft?.userId == null) {
    return;
  }
  try {
    const payload = { ...draft, savedAt: new Date().toISOString() };
    if (payload.couponHold && isHoldExpired(payload.couponHold)) {
      payload.couponHold = null;
      payload.couponMessage = "";
      payload.holdSnapshot = null;
    }
    if (payload.seatHold && isSeatHoldExpired(payload.seatHold)) {
      payload.seatHold = null;
    }
    const key = storageKey(draft.eventId, draft.userId);
    const json = JSON.stringify(payload);
    sessionStorage.setItem(key, json);
    localStorage.setItem(key, json);
  } catch {
    /* quota / private mode */
  }
}

export function clearEventCheckoutDraft(eventId, userId) {
  if (eventId == null || userId == null) {
    return;
  }
  const key = storageKey(eventId, userId);
  try {
    sessionStorage.removeItem(key);
    localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

export function datesKey(dates) {
  return (dates || []).slice().sort().join(",");
}

export function formatHoldCountdown(msRemaining) {
  const totalSec = Math.max(0, Math.ceil(msRemaining / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/** Normalize API hold payload for storage (supports camelCase or snake_case). */
export function normalizeCouponHoldPayload(data) {
  if (!data || typeof data !== "object") {
    return null;
  }
  const holdToken = data.holdToken || data.hold_token;
  if (!holdToken) {
    return null;
  }
  return {
    holdToken,
    expiresAt: data.expiresAt || data.expires_at || null,
    holdMinutes: data.holdMinutes ?? data.hold_minutes,
    couponCode: data.couponCode || data.coupon_code,
    couponId: data.couponId ?? data.coupon_id,
    subtotal: data.subtotal,
    discount: data.discount,
    total: data.total,
    message: data.message
  };
}
