export function isHomeFeaturedEvent(event) {
  const value = event?.home_featured;
  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }
  if (value && typeof value === "object" && Array.isArray(value.data)) {
    return Number(value.data[0]) === 1;
  }
  return false;
}

/** Pinned homepage events first (newest pin first), then keep the incoming date order. */
export function sortEventsWithHomeFeaturedFirst(events) {
  return [...(events || [])].sort((a, b) => {
    const pa = isHomeFeaturedEvent(a) ? 1 : 0;
    const pb = isHomeFeaturedEvent(b) ? 1 : 0;
    if (pa !== pb) {
      return pb - pa;
    }
    if (!pa) {
      return 0;
    }
    const ta = Date.parse(a?.home_featured_at || 0) || 0;
    const tb = Date.parse(b?.home_featured_at || 0) || 0;
    if (ta !== tb) {
      return tb - ta;
    }
    return 0;
  });
}

/** All spotlighted events first (no cap), then fill remaining slots up to `limit`. */
export function pickSpotlightThenFill(events, limit = 6) {
  const list = [];
  const seen = new Set();
  for (const item of events || []) {
    if (!item || item.id == null) {
      continue;
    }
    const id = String(item.id);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    list.push(item);
  }
  const featured = sortEventsWithHomeFeaturedFirst(list.filter(isHomeFeaturedEvent));
  const rest = list.filter((item) => !isHomeFeaturedEvent(item));
  const cap = Math.max(Math.max(1, Number(limit) || 6), featured.length);
  return [...featured, ...rest].slice(0, cap);
}
