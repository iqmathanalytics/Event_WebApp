/**
 * Home page carousels: 6 items — first 4 favor Hot Selling / Trending / One of a Kind (non-premium),
 * last 2 are premium (Yay! deal events or premium deals), tag-ranked within each group.
 * If the pool is only premium or only standard, the row is still split 4 + 2 by tag score.
 */

const TAG_WEIGHT = Object.freeze({
  "Hot Selling": 100,
  Trending: 50,
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

function byDiscoveryThenPopularity(a, b) {
  const da = tagDiscoveryScore(a.tags);
  const db = tagDiscoveryScore(b.tags);
  if (db !== da) {
    return db - da;
  }
  return Number(b.popularity_score || 0) - Number(a.popularity_score || 0);
}

function takeSixFromSorted(sorted) {
  return [...sorted.slice(0, 4), ...sorted.slice(4, 6)].slice(0, 6);
}

/**
 * @param {object[]} items - rows with id, tags[], popularity_score
 * @param {{ isPremium: (item: object) => boolean }} opts
 */
export function pickHomeCarouselSix(items, { isPremium }) {
  const rows = (items || []).filter((x) => x && x.id != null);
  if (!rows.length) {
    return [];
  }

  const sortedPremium = rows.filter((r) => isPremium(r)).sort(byDiscoveryThenPopularity);
  const sortedStandard = rows.filter((r) => !isPremium(r)).sort(byDiscoveryThenPopularity);

  if (!sortedStandard.length && sortedPremium.length) {
    return takeSixFromSorted(sortedPremium);
  }
  if (!sortedPremium.length && sortedStandard.length) {
    return takeSixFromSorted(sortedStandard);
  }

  const lastTwo = [];
  const used = new Set();

  for (const item of sortedPremium) {
    if (lastTwo.length >= 2) {
      break;
    }
    lastTwo.push(item);
    used.add(item.id);
  }

  const firstFour = [];
  for (const item of sortedStandard) {
    if (firstFour.length >= 4) {
      break;
    }
    if (used.has(item.id)) {
      continue;
    }
    firstFour.push(item);
    used.add(item.id);
  }

  if (firstFour.length < 4) {
    const rest = rows.filter((r) => !isPremium(r) && !used.has(r.id)).sort(byDiscoveryThenPopularity);
    for (const item of rest) {
      if (firstFour.length >= 4) {
        break;
      }
      firstFour.push(item);
      used.add(item.id);
    }
  }

  if (firstFour.length < 4) {
    const rest = rows.filter((r) => !used.has(r.id)).sort(byDiscoveryThenPopularity);
    for (const item of rest) {
      if (firstFour.length >= 4) {
        break;
      }
      firstFour.push(item);
      used.add(item.id);
    }
  }

  if (lastTwo.length < 2) {
    for (const item of sortedPremium) {
      if (lastTwo.length >= 2) {
        break;
      }
      if (used.has(item.id)) {
        continue;
      }
      lastTwo.push(item);
      used.add(item.id);
    }
  }

  if (lastTwo.length < 2) {
    const rest = rows.filter((r) => !used.has(r.id)).sort(byDiscoveryThenPopularity);
    for (const item of rest) {
      if (lastTwo.length >= 2) {
        break;
      }
      lastTwo.push(item);
      used.add(item.id);
    }
  }

  return [...firstFour.slice(0, 4), ...lastTwo.slice(0, 2)].slice(0, 6);
}
