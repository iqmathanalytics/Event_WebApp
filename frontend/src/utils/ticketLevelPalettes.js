/**
 * Visual palettes for ticket tiers in the checkout cart.
 * Matched by level name first, then by sorted price rank, then index.
 */

const PALETTES = {
  standard: {
    tierLabel: "Essential",
    icon: "◆",
    cardIdle:
      "border-sky-200/90 bg-gradient-to-br from-sky-50 via-white to-cyan-50/80 shadow-[0_4px_24px_rgba(14,165,233,0.12)]",
    cardActive:
      "border-sky-400/90 bg-gradient-to-br from-sky-100/90 via-white to-cyan-100 ring-2 ring-sky-300/70 shadow-[0_8px_32px_rgba(14,165,233,0.28)]",
    badge: "bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-[0_2px_12px_rgba(14,165,233,0.45)]",
    price: "text-sky-900",
    priceMuted: "text-sky-600/80",
    title: "text-slate-900",
    desc: "text-slate-600",
    lineTotal: "text-sky-800",
    shine: "from-transparent via-sky-200/50 to-transparent",
    glow: "bg-sky-400/20",
    btn: "border-sky-300/80 bg-white/90 text-sky-900 hover:border-sky-400 hover:bg-sky-50 hover:shadow-[0_0_16px_rgba(14,165,233,0.25)]",
    btnActive: "border-sky-500 bg-sky-500 text-white shadow-[0_0_20px_rgba(14,165,233,0.4)]",
    qty: "text-sky-950",
    animateShine: false,
    animateGlow: false
  },
  premium: {
    tierLabel: "Elevated",
    icon: "✦",
    cardIdle:
      "border-violet-200/90 bg-gradient-to-br from-violet-50 via-fuchsia-50/40 to-purple-50 shadow-[0_4px_28px_rgba(139,92,246,0.14)]",
    cardActive:
      "border-violet-400/90 bg-gradient-to-br from-violet-100/80 via-fuchsia-50 to-purple-100 ring-2 ring-violet-300/80 shadow-[0_10px_36px_rgba(139,92,246,0.32)]",
    badge: "bg-gradient-to-r from-violet-600 via-fuchsia-500 to-purple-600 text-white shadow-[0_2px_14px_rgba(139,92,246,0.5)]",
    price: "text-violet-950",
    priceMuted: "text-violet-600/85",
    title: "text-slate-900",
    desc: "text-slate-600",
    lineTotal: "text-violet-900",
    shine: "from-transparent via-violet-200/60 to-transparent",
    glow: "bg-violet-500/25",
    btn: "border-violet-300/80 bg-white/90 text-violet-900 hover:border-violet-400 hover:bg-violet-50 hover:shadow-[0_0_18px_rgba(139,92,246,0.3)]",
    btnActive: "border-violet-600 bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white shadow-[0_0_22px_rgba(139,92,246,0.45)]",
    qty: "text-violet-950",
    animateShine: true,
    animateGlow: true
  },
  luxe: {
    tierLabel: "Luxe",
    icon: "★",
    cardIdle:
      "border-amber-300/80 bg-gradient-to-br from-amber-50 via-yellow-50/90 to-orange-50/70 shadow-[0_6px_32px_rgba(245,158,11,0.18)]",
    cardActive:
      "border-amber-400 bg-gradient-to-br from-amber-100/95 via-yellow-50 to-orange-100/90 ring-2 ring-amber-400/90 shadow-[0_12px_40px_rgba(245,158,11,0.38),0_0_48px_rgba(251,191,36,0.25)]",
    badge:
      "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-amber-950 shadow-[0_2px_16px_rgba(245,158,11,0.55)] ticket-tier-badge-gold",
    price: "text-amber-950",
    priceMuted: "text-amber-700/90",
    title: "text-amber-950",
    desc: "text-amber-900/75",
    lineTotal: "text-amber-900 font-bold",
    shine: "from-transparent via-amber-200/70 to-transparent",
    glow: "bg-amber-400/35",
    btn: "border-amber-400/90 bg-white/95 text-amber-950 hover:border-amber-500 hover:bg-amber-50 hover:shadow-[0_0_20px_rgba(245,158,11,0.35)]",
    btnActive:
      "border-amber-500 bg-gradient-to-br from-amber-500 via-yellow-400 to-amber-600 text-amber-950 shadow-[0_0_24px_rgba(251,191,36,0.55)]",
    qty: "text-amber-950",
    animateShine: true,
    animateGlow: true
  }
};

const NAME_RULES = [
  { test: (n) => /\b(vip|platinum|gold|diamond|luxury|luxe|royal)\b/i.test(n), key: "luxe" },
  { test: (n) => /\b(premium|plus|preferred|elevated|priority|front.?row)\b/i.test(n), key: "premium" },
  {
    test: (n) => /\b(general|standard|ga\b|admission|basic|regular|economy)\b/i.test(n),
    key: "standard"
  }
];

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

/**
 * @param {{ name?: string, price?: number }} level
 * @param {number} index — position in displayed list
 * @param {{ name?: string, price?: number }[]} allLevels
 */
export function resolveTicketLevelPalette(level, index, allLevels = []) {
  const byName = paletteKeyFromName(level?.name);
  if (byName) {
    return { key: byName, ...PALETTES[byName] };
  }

  const sorted = [...(allLevels || [])].sort(
    (a, b) => Number(a?.price || 0) - Number(b?.price || 0)
  );
  const rank = sorted.findIndex(
    (l) =>
      (level?.id && l?.id && String(l.id) === String(level.id)) ||
      String(l?.name || "") === String(level?.name || "")
  );
  const priceRank = rank >= 0 ? rank : index;
  const key = paletteKeyFromPriceRank(priceRank, sorted.length || 1);
  const fallbackKeys = ["standard", "premium", "luxe"];
  const resolved = key || fallbackKeys[index % fallbackKeys.length];
  return { key: resolved, ...PALETTES[resolved] };
}

export const TIER_CHART_COLORS = {
  standard: "#0ea5e9",
  premium: "#8b5cf6",
  luxe: "#f59e0b",
  other: "#64748b"
};

export { PALETTES };
