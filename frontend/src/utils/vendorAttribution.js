const STORAGE_PREFIX = "bmt_vendor_code:";
const SESSION_KEY = "bmt_vendor_session";

function normalizeVendorCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .slice(0, 40);
}

export function readVendorCodeFromSearch(search) {
  try {
    const params = new URLSearchParams(search || (typeof window !== "undefined" ? window.location.search : ""));
    const raw = params.get("vendor") || params.get("vendor_code") || "";
    return normalizeVendorCode(raw);
  } catch {
    return "";
  }
}

export function persistVendorCodeForEvent(eventId, vendorCode) {
  const id = Number(eventId);
  const code = normalizeVendorCode(vendorCode);
  if (!id || !code || typeof sessionStorage === "undefined") {
    return;
  }
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${id}`, code);
  } catch {
    /* ignore quota */
  }
}

export function getPersistedVendorCodeForEvent(eventId) {
  const id = Number(eventId);
  if (!id || typeof sessionStorage === "undefined") {
    return "";
  }
  try {
    return normalizeVendorCode(sessionStorage.getItem(`${STORAGE_PREFIX}${id}`));
  } catch {
    return "";
  }
}

/** Resolve vendor code for checkout: URL/session for this event. */
export function resolveVendorCodeForEvent(eventId, search) {
  const fromUrl = readVendorCodeFromSearch(search);
  if (fromUrl) {
    persistVendorCodeForEvent(eventId, fromUrl);
    return fromUrl;
  }
  return getPersistedVendorCodeForEvent(eventId);
}

export function getOrCreateVendorSessionKey() {
  if (typeof sessionStorage === "undefined") {
    return `s${Date.now()}`;
  }
  try {
    let key = sessionStorage.getItem(SESSION_KEY);
    if (!key || key.length < 8) {
      key = `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
      sessionStorage.setItem(SESSION_KEY, key);
    }
    return key;
  } catch {
    return `s${Date.now()}`;
  }
}

export { normalizeVendorCode };
