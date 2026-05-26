/**
 * Coupon validity datetimes are stored and compared as naive wall-clock strings
 * (YYYY-MM-DD HH:mm:ss) in APP_TIMEZONE — not UTC ISO strings.
 */

const MYSQL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/;

function getAppTimeZone() {
  return process.env.APP_TIMEZONE || "America/New_York";
}

function formatPartsInTz(date, timeZone) {
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
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second")
  };
}

/** Normalize to `YYYY-MM-DD HH:mm:ss` for lexicographic compare. */
function normalizeMysqlDateTime(value) {
  if (value === "" || value == null) {
    return "";
  }
  const s = String(value).trim();
  const m = s.match(MYSQL_DATETIME_RE);
  if (!m) {
    return s;
  }
  const sec = m[6] != null ? m[6] : "00";
  return `${m[1]}-${m[2]}-${m[3]} ${m[4]}:${m[5]}:${sec}`;
}

/**
 * Parse datetime-local (`YYYY-MM-DDTHH:mm`) or MySQL datetime; store without UTC shift.
 */
function toMysqlDateTimeString(value) {
  if (value === "" || value == null) {
    return null;
  }
  const s = String(value).trim();
  const direct = s.match(MYSQL_DATETIME_RE);
  if (direct) {
    const sec = direct[6] != null ? direct[6] : "00";
    return `${direct[1]}-${direct[2]}-${direct[3]} ${direct[4]}:${direct[5]}:${sec}`;
  }

  const d = new Date(s);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  const p = formatPartsInTz(d, getAppTimeZone());
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second}`;
}

/**
 * Convert naive wall-clock (from datetime-local / MySQL) to UTC ms.
 * @param {number} timezoneOffsetMinutes - `new Date().getTimezoneOffset()` from the browser
 */
function naiveWallClockToUtcMs(mysqlDatetime, timezoneOffsetMinutes = 0) {
  const norm = normalizeMysqlDateTime(mysqlDatetime);
  const m = norm.match(MYSQL_DATETIME_RE);
  if (!m) {
    return NaN;
  }
  const y = Number(m[1]);
  const mo = Number(m[2]) - 1;
  const d = Number(m[3]);
  const h = Number(m[4]);
  const mi = Number(m[5]);
  const s = Number(m[6] != null ? m[6] : 0);
  const offset = Number(timezoneOffsetMinutes);
  if (!Number.isFinite(offset)) {
    return NaN;
  }
  return Date.UTC(y, mo, d, h, mi, s) + offset * 60 * 1000;
}

function isWithinCouponWindow(startsAt, endsAt, timezoneOffsetMinutes = 0) {
  const offset = Number(timezoneOffsetMinutes);
  if (!Number.isFinite(offset)) {
    return false;
  }
  const nowMs = Date.now();
  if (startsAt) {
    const startMs = naiveWallClockToUtcMs(startsAt, offset);
    if (Number.isFinite(startMs) && nowMs < startMs) {
      return false;
    }
  }
  if (endsAt) {
    const endMs = naiveWallClockToUtcMs(endsAt, offset);
    // datetime-local is minute precision — treat end minute as inclusive
    if (Number.isFinite(endMs) && nowMs > endMs + 59 * 1000) {
      return false;
    }
  }
  return true;
}

/** For `<input type="datetime-local" />` from API/MySQL value. */
function mysqlToDatetimeLocalInput(value) {
  if (!value) {
    return "";
  }
  const normalized = normalizeMysqlDateTime(value);
  if (!normalized) {
    return "";
  }
  return normalized.replace(" ", "T").slice(0, 16);
}

module.exports = {
  getAppTimeZone,
  toMysqlDateTimeString,
  normalizeMysqlDateTime,
  naiveWallClockToUtcMs,
  isWithinCouponWindow,
  mysqlToDatetimeLocalInput
};
