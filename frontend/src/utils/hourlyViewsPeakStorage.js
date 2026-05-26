const STORAGE_KEY = "bmt_insights_hourly_peaks_v1";

function readAll() {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeAll(data) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    /* quota or private mode */
  }
}

export function hourlyPeakKey(eventId, dateStr, hour) {
  return `${eventId}|${dateStr}|${hour}`;
}

export function dayTotalPeakKey(eventId, dateStr) {
  return `${eventId}|${dateStr}|__day_total`;
}

export function getStoredHourlyPeak(key) {
  const all = readAll();
  return Number(all[key]) || 0;
}

export function persistHourlyPeak(key, views) {
  const n = Number(views) || 0;
  if (n <= 0) {
    return 0;
  }
  const all = readAll();
  const prev = Number(all[key]) || 0;
  const next = Math.max(prev, n);
  if (next > prev) {
    all[key] = next;
    writeAll(all);
  }
  return next;
}

export function applyStoredHourlyPeak(key, views) {
  const n = Number(views) || 0;
  const stored = getStoredHourlyPeak(key);
  const next = Math.max(n, stored);
  if (n > stored) {
    persistHourlyPeak(key, n);
  }
  return next;
}

export function applyStoredDayTotalPeak(key, total) {
  return applyStoredHourlyPeak(key, total);
}
