function parseDateOnly(value) {
  if (!value) {
    return null;
  }
  const text = String(value).slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }
  return text;
}

function normalizeDateList(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  const unique = new Set();
  values.forEach((item) => {
    const parsed = parseDateOnly(item);
    if (parsed) {
      unique.add(parsed);
    }
  });
  return Array.from(unique).sort();
}

function listDatesInRange(startDate, endDate, maxDays = 366) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end || start > end) {
    return [];
  }
  const cursor = new Date(`${start}T00:00:00`);
  const endDateObj = new Date(`${end}T00:00:00`);
  const dates = [];
  let safety = 0;
  while (cursor <= endDateObj && safety < maxDays) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
    safety += 1;
  }
  return dates;
}

export function getEventAvailableDates(event) {
  if (!event) {
    return [];
  }
  const scheduleType = event.schedule_type || "single";
  if (scheduleType === "multiple") {
    return normalizeDateList(event.event_dates || event.event_dates_json || []);
  }
  if (scheduleType === "range") {
    return listDatesInRange(event.event_start_date, event.event_end_date);
  }
  const single = parseDateOnly(event.event_date);
  return single ? [single] : [];
}

/** Earliest show date used for listing sort and display consistency. */
export function getEventSortDate(event) {
  const dates = getEventAvailableDates(event);
  if (dates.length) {
    return dates[0];
  }
  return parseDateOnly(event?.event_date) || "";
}

/** Local calendar YYYY-MM-DD (not UTC) for “has this show day passed?”. */
export function todayCalendarDateString(now = new Date()) {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Last scheduled show date for the event. */
export function getEventLastShowDate(event) {
  const dates = getEventAvailableDates(event);
  if (dates.length) {
    return dates[dates.length - 1];
  }
  return parseDateOnly(event?.event_date) || "";
}

/** True when every show date is before today (day-of still bookable). */
export function isEventPast(event, todayStr = todayCalendarDateString()) {
  const end = getEventLastShowDate(event);
  if (!end) {
    return false;
  }
  return end < todayStr;
}

/** Show dates that are still on or after today. */
export function getEventBookableDates(event, todayStr = todayCalendarDateString()) {
  return getEventAvailableDates(event).filter((d) => d >= todayStr);
}

export { normalizeDateList, parseDateOnly };
