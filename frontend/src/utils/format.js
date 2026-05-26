export function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

/**
 * US short date: "MM/DD/YYYY" (zero-padded month and day).
 * Accepts `YYYY-MM-DD`, ISO datetimes, and other strings `Date` can parse.
 */
export function formatDateUS(value) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  const s = String(value).trim();
  let parsed;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    parsed = new Date(`${s}T00:00:00`);
  } else {
    parsed = new Date(s);
  }
  if (Number.isNaN(parsed.getTime())) {
    return s;
  }
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const dd = String(parsed.getDate()).padStart(2, "0");
  const yyyy = String(parsed.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
}

/** "2:30 PM" from "14:30" or "14:30:00" time strings. */
/** "2 hrs 30 min", "1 hr", "45 min", or null when unset. */
export function formatEventDuration(hours, minutes) {
  const h = Number(hours);
  const m = Number(minutes);
  const hasH = Number.isFinite(h) && h > 0;
  const hasM = Number.isFinite(m) && m > 0;
  if (!hasH && !hasM) {
    return null;
  }
  const parts = [];
  if (hasH) {
    parts.push(`${h} hr${h === 1 ? "" : "s"}`);
  }
  if (hasM) {
    parts.push(`${m} min`);
  }
  return parts.join(" ");
}

export function formatTime12Hour(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "Time not specified";
  }
  const match = raw.match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return raw;
  }
  const hour24 = Number(match[1]);
  const minute = match[2];
  if (!Number.isFinite(hour24) || hour24 < 0 || hour24 > 23) {
    return raw;
  }
  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute} ${suffix}`;
}
