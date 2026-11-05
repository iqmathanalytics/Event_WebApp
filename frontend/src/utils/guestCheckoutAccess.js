const PREFIX = "bmt_guest_checkout_atok_v1_";

function keyFor(paymentIntentId) {
  return `${PREFIX}${String(paymentIntentId || "").trim()}`;
}

export function saveGuestCheckoutAccessToken(paymentIntentId, token) {
  const pi = String(paymentIntentId || "").trim();
  const value = String(token || "").trim();
  if (!pi || !value || typeof sessionStorage === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(keyFor(pi), value);
  } catch {
    /* ignore */
  }
}

export function loadGuestCheckoutAccessToken(paymentIntentId) {
  const pi = String(paymentIntentId || "").trim();
  if (!pi || typeof sessionStorage === "undefined") {
    return "";
  }
  try {
    return String(sessionStorage.getItem(keyFor(pi)) || "").trim();
  } catch {
    return "";
  }
}

export function clearGuestCheckoutAccessToken(paymentIntentId) {
  const pi = String(paymentIntentId || "").trim();
  if (!pi || typeof sessionStorage === "undefined") {
    return;
  }
  try {
    sessionStorage.removeItem(keyFor(pi));
  } catch {
    /* ignore */
  }
}
