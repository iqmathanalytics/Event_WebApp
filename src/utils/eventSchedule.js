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

function getEventAvailableDates(event) {
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

function getPrimaryEventDate(event) {
  const dates = getEventAvailableDates(event);
  return dates[0] || parseDateOnly(event?.event_date);
}

module.exports = {
  parseDateOnly,
  normalizeDateList,
  listDatesInRange,
  getEventAvailableDates,
  getPrimaryEventDate
};
