/**
 * Home page carousels: rank by GA popularity (30-day page views), then tag score as tiebreaker.
 * No separate slots for exclusive / premium items — order is purely by metrics.
 */

const TAG_WEIGHT = Object.freeze({
  Trending: 500,
  "Hot Selling": 120,
  "Recently Added": 60,
  "One of a Kind": 25
});

export function tagDiscoveryScore(tags) {
  if (!Array.isArray(tags) || !tags.length) {
    return 0;
  }
  let score = 0;
  for (const t of tags) {
    score += TAG_WEIGHT[t] || 0;
  }
  return score;
}

function gaPopularityValue(item) {
  return Number(item?.ga_page_views_30d ?? item?.popularity_score ?? 0);
}

function byPopularityThenTags(a, b) {
  const popDiff = gaPopularityValue(b) - gaPopularityValue(a);
  if (popDiff !== 0) {
    return popDiff;
  }
  return tagDiscoveryScore(b.tags) - tagDiscoveryScore(a.tags);
}

function sortByPopularity(items) {
  return [...(items || [])].filter((x) => x && x.id != null).sort(byPopularityThenTags);
}

/** Top 6 listings by GA popularity (hero carousel). */
export function pickHomeCarouselSix(items) {
  return sortByPopularity(items).slice(0, 6);
}

/** First N items — caller should pass a list already sorted by event date. */
export function pickHomeCarouselFromSorted(items, count = 6) {
  const cap = Math.max(1, Number(count) || 6);
  return (items || []).filter((x) => x && x.id != null).slice(0, cap);
}

/**
 * Landing grid section — top N by GA popularity.
 * @param {object[]} items
 * @param {{ limit?: number }} [opts]
 */
export function pickLandingSectionCards(items, { limit = 5 } = {}) {
  const cap = Math.max(1, Number(limit) || 5);
  return sortByPopularity(items).slice(0, cap);
}

/** First N items — caller should pass a list already sorted by event date. */
export function pickLandingSectionFromSorted(items, { limit = 5 } = {}) {
  const cap = Math.max(1, Number(limit) || 5);
  return (items || []).filter((x) => x && x.id != null).slice(0, cap);
}
