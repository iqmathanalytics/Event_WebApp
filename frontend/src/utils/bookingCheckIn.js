const DEFAULT_APP_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://www.bookmytickets.us";

export function appBaseUrl() {
  const configured = (import.meta.env.VITE_APP_URL || import.meta.env.VITE_PUBLIC_APP_URL || "")
    .trim()
    .replace(/\/$/, "");
  return configured || DEFAULT_APP_ORIGIN;
}

export function buildAdminVerifyTicketUrl(checkInCode) {
  const code = String(checkInCode || "").trim();
  const base = appBaseUrl();
  if (!code) {
    return `${base}/dashboard/admin/verify-ticket`;
  }
  return `${base}/dashboard/admin/verify-ticket?code=${encodeURIComponent(code)}`;
}

export function normalizeCheckInCodeInput(raw) {
  const value = String(raw || "").trim();
  if (!value) {
    return "";
  }
  try {
    const asUrl = new URL(value);
    const fromQuery = asUrl.searchParams.get("code");
    if (fromQuery) {
      return fromQuery.trim();
    }
  } catch (_err) {
    /* not a URL */
  }
  if (value.includes("code=")) {
    const match = value.match(/[?&]code=([^&]+)/i);
    if (match?.[1]) {
      return decodeURIComponent(match[1]).trim();
    }
  }
  return value;
}
