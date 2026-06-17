/**
 * Seats.io stores hold tokens in sessionStorage. Stale tokens from a previous
 * event/workspace cause hold-token 400 errors when the chart loads.
 */
export function clearSeatsioBrowserSession() {
  if (typeof window === "undefined") {
    return;
  }

  const storages = [window.sessionStorage, window.localStorage].filter(Boolean);
  for (const storage of storages) {
    const keys = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (!key) {
        continue;
      }
      const lower = key.toLowerCase();
      if (
        lower.includes("seatsio") ||
        lower.includes("holdtoken") ||
        lower.includes("hold-token") ||
        lower.includes("seatingchart")
      ) {
        keys.push(key);
      }
    }
    keys.forEach((key) => {
      try {
        storage.removeItem(key);
      } catch (_err) {
        /* ignore */
      }
    });
  }
}
