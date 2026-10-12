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
    hour,
    minute: get("minute"),
    second: get("second")
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

/** UTC Date for wall-clock Y-M-D H:M:S in timeZone (handles EDT/EST). */
function zonedWallTimeToUtcDate(year, month, day, hour, minute, second, timeZone = getGaReportingTimezone()) {
  let utcMs = Date.UTC(year, month - 1, day, hour, minute, second);
  for (let i = 0; i < 4; i += 1) {
    const p = getZonedParts(new Date(utcMs), timeZone);
    const asLocalMs = Date.UTC(
      Number(p.year),
      Number(p.month) - 1,
      Number(p.day),
      p.hour,
      Number(p.minute || 0),
      Number(p.second || 0)
    );
    const wantedMs = Date.UTC(year, month - 1, day, hour, minute, second);
    utcMs += wantedMs - asLocalMs;
  }
  return new Date(utcMs);
}

function toMysqlUtcDatetime(date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Parse MySQL TIMESTAMP/DATETIME strings as UTC instants (pool uses dateStrings: true).
 * Matches how we write bounds via toMysqlUtcDatetime for America/New_York day windows.
 */
function parseMysqlUtcDatetime(value) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  const raw = String(value || "").trim();
  if (!raw) {
    return null;
  }
  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/
  );
  if (match) {
    return new Date(
      Date.UTC(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3]),
        Number(match[4] || 0),
        Number(match[5] || 0),
        Number(match[6] || 0)
      )
    );
  }
  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

/**
 * Half-open [start, end) UTC MySQL datetimes for a calendar day in reporting TZ.
 * @param {string} dateStr YYYY-MM-DD
 */
function getZonedDayMysqlBounds(dateStr, timeZone = getGaReportingTimezone()) {
  if (!isValidCalendarDateString(dateStr)) {
    return null;
  }
  const [y, m, d] = dateStr.split("-").map(Number);
  const start = zonedWallTimeToUtcDate(y, m, d, 0, 0, 0, timeZone);
  const end = zonedWallTimeToUtcDate(y, m, d + 1, 0, 0, 0, timeZone);
  return {
    fromMysql: toMysqlUtcDatetime(start),
    toMysql: toMysqlUtcDatetime(end),
    fromUtc: start,
    toUtc: end
  };
}

/** Calendar YYYY-MM-DD for an instant in reporting timezone. */
function getCalendarDateForInstant(date, timeZone = getGaReportingTimezone()) {
  const p = getZonedParts(date instanceof Date ? date : new Date(date), timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

module.exports = {
  getGaReportingTimezone,
  getCalendarDateString,
  getCurrentHour,
  formatHour12,
  getTimezoneShortLabel,
  isValidCalendarDateString,
  formatCalendarDateLabel,
  listHourlyDateOptions,
  zonedWallTimeToUtcDate,
  toMysqlUtcDatetime,
  parseMysqlUtcDatetime,
  getZonedDayMysqlBounds,
  getCalendarDateForInstant,
  getZonedParts
};
