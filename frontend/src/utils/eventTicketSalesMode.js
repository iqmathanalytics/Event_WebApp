function stripNoise(value) {
  return String(value)
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
}

/** Raw value from API row (snake / alternate casings). */
export function pickTicketSalesModeFromListingRow(row) {
  if (!row || typeof row !== "object") {
    return undefined;
  }
  const candidates = [row.ticket_sales_mode, row.TICKET_SALES_MODE, row.ticketSalesMode];
  for (const v of candidates) {
    if (v !== undefined && v !== null && v !== "") {
      return v;
    }
  }
  return undefined;
}

export function resolveEventTicketSalesMode(row) {
  return normalizeEventTicketSalesMode(pickTicketSalesModeFromListingRow(row));
}

/**
 * Coerce event ticket_sales_mode from API/DB for UI (platform vs external checkout).
 */
export function normalizeEventTicketSalesMode(value) {
  if (value === undefined || value === null) {
    return "external";
  }
  if (typeof value === "bigint") {
    return normalizeEventTicketSalesMode(Number(value));
  }
  if (value === 2 || value === "2") {
    return "platform";
  }
  if (value === 1 || value === "1") {
    return "external";
  }
  const s = stripNoise(value);
  if (!s) {
    return "external";
  }
  if (
    s === "platform" ||
    s === "on_site" ||
    s === "onsite" ||
    s === "on-site" ||
    s === "on site" ||
    s === "this_site" ||
    s === "thissite" ||
    s === "site_booking" ||
    s === "internal"
  ) {
    return "platform";
  }
  if (s === "external" || s === "offsite" || s === "off_site" || s === "off site") {
    return "external";
  }
  return "external";
}
