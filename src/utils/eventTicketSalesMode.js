/**
 * Normalize DB/driver values to "platform" | "external".
 * Handles ENUM index (1=external, 2=platform for ENUM('external','platform')),
 * Buffers, BOM / zero-width chars, and common label variants.
 */
function stripNoise(value) {
  return String(value)
    .replace(/^\uFEFF/, "")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .trim()
    .toLowerCase();
}

function readTicketSalesModeRaw(row) {
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

function normalizeTicketSalesMode(value) {
  if (value === undefined || value === null) {
    return "external";
  }
  if (typeof value === "bigint") {
    return normalizeTicketSalesMode(Number(value));
  }
  if (Buffer.isBuffer(value)) {
    return normalizeTicketSalesMode(value.toString("utf8"));
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

/**
 * For Zod request bodies: keep `undefined` when the client omitted the field
 * so `.optional()` still means “no change” on PATCH; otherwise return platform|external.
 */
function coerceTicketSalesModeBodyInput(value) {
  if (value === undefined) {
    return undefined;
  }
  if (value === null) {
    return undefined;
  }
  if (typeof value === "string" && stripNoise(value) === "") {
    return undefined;
  }
  return normalizeTicketSalesMode(value);
}

function pickTicketSalesModeFromPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "ticket_sales_mode")) {
    return payload.ticket_sales_mode;
  }
  if (Object.prototype.hasOwnProperty.call(payload, "ticketSalesMode")) {
    return payload.ticketSalesMode;
  }
  return undefined;
}

module.exports = {
  normalizeTicketSalesMode,
  coerceTicketSalesModeBodyInput,
  pickTicketSalesModeFromPayload,
  readTicketSalesModeRaw
};
