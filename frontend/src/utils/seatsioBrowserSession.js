/**
 * Seats.io stores hold tokens in sessionStorage. Stale tokens from a previous
 * event/workspace cause "session expired" / hold-tokens 400 when the chart loads.
 */
export function clearSeatsioBrowserSession() {
  if (typeof window === "undefined" || !window.sessionStorage) {
    return;
  }
  const keys = [];
  for (let i = 0; i < window.sessionStorage.length; i += 1) {
    const key = window.sessionStorage.key(i);
    if (!key) {
      continue;
    }
    const lower = key.toLowerCase();
    if (lower.includes("seatsio") || lower.includes("holdtoken") || lower.includes("hold-token")) {
      keys.push(key);
    }
  }
  keys.forEach((key) => {
    try {
      window.sessionStorage.removeItem(key);
    } catch (_err) {
      /* ignore */
    }
  });
}
