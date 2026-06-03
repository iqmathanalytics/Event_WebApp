const crypto = require("crypto");
const { dashboardUrl } = require("./brandEmail");

function generateCheckInCode() {
  return crypto.randomBytes(16).toString("hex");
}

function buildAdminVerifyTicketUrl(checkInCode) {
  const code = String(checkInCode || "").trim();
  if (!code) {
    return dashboardUrl("/dashboard/admin/verify-ticket");
  }
  return `${dashboardUrl("/dashboard/admin/verify-ticket")}?code=${encodeURIComponent(code)}`;
}

function normalizeCheckInCodeInput(raw) {
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

module.exports = {
  generateCheckInCode,
  buildAdminVerifyTicketUrl,
  normalizeCheckInCodeInput
};
