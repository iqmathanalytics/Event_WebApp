/**
 * GA4 date/hour alignment — use app reporting timezone, not server UTC (e.g. Railway).
 * Set GA4 property reporting timezone in Admin to match GA4_REPORTING_TIMEZONE / APP_TIMEZONE.
 */

function getGaReportingTimezone() {
  return (
    process.env.GA4_REPORTING_TIMEZONE?.trim() ||
    process.env.APP_TIMEZONE?.trim() ||
    "America/New_York"
  );
}

function getZonedParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value || "00";
  let hour = Number(get("hour"));
  if (hour === 24) {
    hour = 0;
  }
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour
  };
}

/** YYYY-MM-DD in reporting timezone (offset days from today). */
function getCalendarDateString(dayOffset = 0, timeZone = getGaReportingTimezone()) {
  const now = new Date();
  const today = getZonedParts(now, timeZone);
  const anchor = new Date(
    Date.UTC(Number(today.year), Number(today.month) - 1, Number(today.day) + dayOffset, 12, 0, 0)
  );
  const p = getZonedParts(anchor, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

function getCurrentHour(timeZone = getGaReportingTimezone()) {
  return getZonedParts(new Date(), timeZone).hour;
}

function formatHour12(hour) {
  const h = Number(hour);
  if (!Number.isFinite(h) || h < 0 || h > 23) {
    return "—";
  }
  if (h === 0) {
    return "12 AM";
  }
  if (h < 12) {
    return `${h} AM`;
  }
  if (h === 12) {
    return "12 PM";
  }
  return `${h - 12} PM`;
}

function getTimezoneShortLabel(timeZone = getGaReportingTimezone()) {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "short"
    }).formatToParts(new Date());
    return parts.find((p) => p.type === "timeZoneName")?.value || timeZone;
  } catch {
    return timeZone;
  }
}

const CALENDAR_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDateString(value) {
  return CALENDAR_DATE_RE.test(String(value || "").trim());
}

/** US-style short label for chart day picker (e.g. "May 22"). */
function formatCalendarDateLabel(dateStr, timeZone = getGaReportingTimezone()) {
  if (!isValidCalendarDateString(dateStr)) {
    return dateStr || "";
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    month: "short",
    day: "numeric"
  }).format(utc);
}

/** Recent calendar days for hourly chart (today first). */
/** Today plus prior N-1 days (default 7 = today + past 6). */
function listHourlyDateOptions(dayCount = 7, timeZone = getGaReportingTimezone()) {
  const count = Math.max(1, Math.min(Number(dayCount) || 7, 31));
  const options = [];
  for (let offset = 0; offset < count; offset += 1) {
    const date = getCalendarDateString(-offset, timeZone);
    let label;
    if (offset === 0) {
      label = "Today";
    } else if (offset === 1) {
      label = "Yesterday";
    } else {
      label = formatCalendarDateLabel(date, timeZone);
    }
    options.push({
      date,
      label,
      is_today: offset === 0,
      live: offset === 0
    });
  }
  return options;
}

module.exports = {
  getGaReportingTimezone,
  getCalendarDateString,
  getCurrentHour,
  formatHour12,
  getTimezoneShortLabel,
  isValidCalendarDateString,
  formatCalendarDateLabel,
  listHourlyDateOptions
};
