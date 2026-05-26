const MYSQL_DATETIME_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/;

/** Map API/MySQL datetime to `datetime-local` value without timezone shift. */
export function mysqlToDatetimeLocalInput(value) {
  if (!value) {
    return "";
  }
  const s = String(value).trim();
  const m = s.match(MYSQL_DATETIME_RE);
  if (!m) {
    return "";
  }
  return `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}`;
}

/** Display date + time from naive MySQL datetime string. */
export function formatCouponDateTimeUS(value) {
  if (!value) {
    return "";
  }
  const s = String(value).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) {
    return s;
  }
  const hour = Number(m[4]);
  const minute = m[5];
  const h12 = hour % 12 || 12;
  const ampm = hour >= 12 ? "PM" : "AM";
  return `${m[2]}/${m[3]}/${m[1]} ${h12}:${minute} ${ampm}`;
}
