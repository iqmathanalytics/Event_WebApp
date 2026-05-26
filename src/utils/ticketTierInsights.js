/**
 * Tier key + chart colors for insights (aligned with frontend ticketLevelPalettes).
 */

const NAME_RULES = [
  { test: (n) => /\b(vip|platinum|gold|diamond|luxury|luxe|royal)\b/i.test(n), key: "luxe" },
  { test: (n) => /\b(premium|plus|preferred|elevated|priority|front.?row)\b/i.test(n), key: "premium" },
  {
    test: (n) => /\b(general|standard|ga\b|admission|basic|regular|economy)\b/i.test(n),
    key: "standard"
  }
];

const CHART_COLORS = {
  standard: "#0ea5e9",
  premium: "#8b5cf6",
  luxe: "#f59e0b",
  other: "#64748b"
};

function paletteKeyFromName(name) {
  const n = String(name || "").trim();
  if (!n) {
    return null;
  }
  const hit = NAME_RULES.find((r) => r.test(n));
  return hit?.key ?? null;
}

function paletteKeyFromPriceRank(rank, count) {
  if (count <= 1) {
    return "standard";
  }
  if (count === 2) {
    return rank === 0 ? "standard" : "luxe";
  }
  if (rank === 0) {
    return "standard";
  }
  if (rank === count - 1) {
    return "luxe";
  }
  return "premium";
}

function resolveTicketTierKey(level, index, allLevels = []) {
  const byName = paletteKeyFromName(level?.name);
  if (byName) {
    return byName;
  }
  const sorted = [...allLevels].sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
  const rank = sorted.findIndex(
    (l) =>
      (level?.id && l?.id && String(l.id) === String(level.id)) ||
      String(l?.name || "") === String(level?.name || "")
  );
  const priceRank = rank >= 0 ? rank : index;
  const fallbackKeys = ["standard", "premium", "luxe"];
  return paletteKeyFromPriceRank(priceRank, sorted.length || 1) || fallbackKeys[index % fallbackKeys.length];
}

function chartColorForTierKey(key) {
  return CHART_COLORS[key] || CHART_COLORS.other;
}

function parseTicketItemsJson(raw) {
  if (!raw) {
    return [];
  }
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (_err) {
      return [];
    }
  }
  return Array.isArray(parsed) ? parsed : [];
}

module.exports = {
  resolveTicketTierKey,
  chartColorForTierKey,
  parseTicketItemsJson,
  CHART_COLORS
};
