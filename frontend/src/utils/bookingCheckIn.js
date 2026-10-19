import { API_BASE_URL } from "../services/api";

const DEFAULT_APP_ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://www.bookmytickets.us";

export function appBaseUrl() {
  const configured = (import.meta.env.VITE_APP_URL || import.meta.env.VITE_PUBLIC_APP_URL || "")
    .trim()
    .replace(/\/$/, "");
  return configured || DEFAULT_APP_ORIGIN;
}

/** Same hosted PNG URL used in booking confirmation emails. */
export function ticketQrImageUrl(checkInCode) {
  const code = String(checkInCode || "").trim();
  if (!code) {
    return null;
  }
  const base = String(API_BASE_URL || "").replace(/\/+$/, "");
  return `${base}/public/ticket-qr/${encodeURIComponent(code)}.png`;
}

export function buildCheckInUrl(checkInCode) {
  const code = String(checkInCode || "").trim();
  const base = appBaseUrl();
  if (!code) {
    return `${base}/check-in`;
  }
  return `${base}/check-in?code=${encodeURIComponent(code)}`;
}

/** @deprecated Use buildCheckInUrl */
export function buildAdminVerifyTicketUrl(checkInCode) {
  return buildCheckInUrl(checkInCode);
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
    // Support paths like /check-in/<code> if ever used
    const parts = asUrl.pathname.split("/").filter(Boolean);
    if (parts[0] === "check-in" && parts[1]) {
      return decodeURIComponent(parts[1]).trim();
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
