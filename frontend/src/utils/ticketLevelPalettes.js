/**
 * Visual palettes for ticket tiers in the checkout cart.
 * Organizer-selected color_key / custom hex wins; otherwise name then price rank.
 */

const PALETTES = {
  standard: {
    tierLabel: "Essential",
    icon: "◆",
    swatch: "#0ea5e9",
    chartColor: "#0ea5e9",
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
    swatch: "#8b5cf6",
    chartColor: "#8b5cf6",
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
    swatch: "#f59e0b",
    chartColor: "#f59e0b",
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
  },
  rose: {
    tierLabel: "Rose",
    icon: "❀",
    swatch: "#f43f5e",
    chartColor: "#f43f5e",
    cardIdle:
      "border-rose-200/90 bg-gradient-to-br from-rose-50 via-white to-pink-50 shadow-[0_4px_24px_rgba(244,63,94,0.12)]",
    cardActive:
      "border-rose-400/90 bg-gradient-to-br from-rose-100/90 via-white to-pink-100 ring-2 ring-rose-300/70 shadow-[0_8px_32px_rgba(244,63,94,0.28)]",
    badge: "bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-[0_2px_12px_rgba(244,63,94,0.45)]",
    price: "text-rose-950",
    priceMuted: "text-rose-600/80",
    title: "text-slate-900",
    desc: "text-slate-600",
    lineTotal: "text-rose-800",
    shine: "from-transparent via-rose-200/50 to-transparent",
    glow: "bg-rose-400/20",
    btn: "border-rose-300/80 bg-white/90 text-rose-900 hover:border-rose-400 hover:bg-rose-50",
    btnActive: "border-rose-500 bg-rose-500 text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]",
    qty: "text-rose-950",
    animateShine: true,
    animateGlow: false
  },
  emerald: {
    tierLabel: "Emerald",
    icon: "◈",
    swatch: "#10b981",
    chartColor: "#10b981",
    cardIdle:
      "border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-teal-50 shadow-[0_4px_24px_rgba(16,185,129,0.12)]",
    cardActive:
      "border-emerald-400/90 bg-gradient-to-br from-emerald-100/90 via-white to-teal-100 ring-2 ring-emerald-300/70 shadow-[0_8px_32px_rgba(16,185,129,0.28)]",
    badge: "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-[0_2px_12px_rgba(16,185,129,0.45)]",
    price: "text-emerald-950",
    priceMuted: "text-emerald-600/80",
    title: "text-slate-900",
    desc: "text-slate-600",
    lineTotal: "text-emerald-800",
    shine: "from-transparent via-emerald-200/50 to-transparent",
    glow: "bg-emerald-400/20",
    btn: "border-emerald-300/80 bg-white/90 text-emerald-900 hover:border-emerald-400 hover:bg-emerald-50",
    btnActive: "border-emerald-500 bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]",
    qty: "text-emerald-950",
    animateShine: false,
    animateGlow: false
  },
  indigo: {
    tierLabel: "Indigo",
    icon: "◇",
    swatch: "#6366f1",
    chartColor: "#6366f1",
    cardIdle:
      "border-indigo-200/90 bg-gradient-to-br from-indigo-50 via-white to-blue-50 shadow-[0_4px_24px_rgba(99,102,241,0.12)]",
    cardActive:
      "border-indigo-400/90 bg-gradient-to-br from-indigo-100/90 via-white to-blue-100 ring-2 ring-indigo-300/70 shadow-[0_8px_32px_rgba(99,102,241,0.28)]",
    badge: "bg-gradient-to-r from-indigo-500 to-blue-500 text-white shadow-[0_2px_12px_rgba(99,102,241,0.45)]",
    price: "text-indigo-950",
    priceMuted: "text-indigo-600/80",
    title: "text-slate-900",
    desc: "text-slate-600",
    lineTotal: "text-indigo-800",
    shine: "from-transparent via-indigo-200/50 to-transparent",
    glow: "bg-indigo-400/20",
    btn: "border-indigo-300/80 bg-white/90 text-indigo-900 hover:border-indigo-400 hover:bg-indigo-50",
    btnActive: "border-indigo-500 bg-indigo-500 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]",
    qty: "text-indigo-950",
    animateShine: true,
    animateGlow: true
  },
  coral: {
    tierLabel: "Coral",
    icon: "●",
    swatch: "#f97316",
    chartColor: "#f97316",
    cardIdle:
      "border-orange-200/90 bg-gradient-to-br from-orange-50 via-white to-amber-50 shadow-[0_4px_24px_rgba(249,115,22,0.12)]",
    cardActive:
      "border-orange-400/90 bg-gradient-to-br from-orange-100/90 via-white to-amber-100 ring-2 ring-orange-300/70 shadow-[0_8px_32px_rgba(249,115,22,0.28)]",
    badge: "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-[0_2px_12px_rgba(249,115,22,0.45)]",
    price: "text-orange-950",
    priceMuted: "text-orange-600/80",
    title: "text-slate-900",
    desc: "text-slate-600",
    lineTotal: "text-orange-800",
    shine: "from-transparent via-orange-200/50 to-transparent",
    glow: "bg-orange-400/20",
    btn: "border-orange-300/80 bg-white/90 text-orange-900 hover:border-orange-400 hover:bg-orange-50",
    btnActive: "border-orange-500 bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]",
    qty: "text-orange-950",
    animateShine: true,
    animateGlow: false
  },
  teal: {
    tierLabel: "Teal",
    icon: "▣",
    swatch: "#14b8a6",
    chartColor: "#14b8a6",
    cardIdle:
      "border-teal-200/90 bg-gradient-to-br from-teal-50 via-white to-cyan-50 shadow-[0_4px_24px_rgba(20,184,166,0.12)]",
    cardActive:
      "border-teal-400/90 bg-gradient-to-br from-teal-100/90 via-white to-cyan-100 ring-2 ring-teal-300/70 shadow-[0_8px_32px_rgba(20,184,166,0.28)]",
    badge: "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-[0_2px_12px_rgba(20,184,166,0.45)]",
    price: "text-teal-950",
    priceMuted: "text-teal-600/80",
    title: "text-slate-900",
    desc: "text-slate-600",
    lineTotal: "text-teal-800",
    shine: "from-transparent via-teal-200/50 to-transparent",
    glow: "bg-teal-400/20",
    btn: "border-teal-300/80 bg-white/90 text-teal-900 hover:border-teal-400 hover:bg-teal-50",
    btnActive: "border-teal-500 bg-teal-500 text-white shadow-[0_0_20px_rgba(20,184,166,0.4)]",
    qty: "text-teal-950",
    animateShine: false,
    animateGlow: false
  },
  crimson: {
    tierLabel: "Crimson",
    icon: "◆",
    swatch: "#dc2626",
    chartColor: "#dc2626",
    cardIdle:
      "border-red-200/90 bg-gradient-to-br from-red-50 via-white to-rose-50 shadow-[0_4px_24px_rgba(220,38,38,0.12)]",
    cardActive:
      "border-red-400/90 bg-gradient-to-br from-red-100/90 via-white to-rose-100 ring-2 ring-red-300/70 shadow-[0_8px_32px_rgba(220,38,38,0.28)]",
    badge: "bg-gradient-to-r from-red-600 to-rose-500 text-white shadow-[0_2px_12px_rgba(220,38,38,0.45)]",
    price: "text-red-950",
    priceMuted: "text-red-600/80",
    title: "text-slate-900",
    desc: "text-slate-600",
    lineTotal: "text-red-800",
    shine: "from-transparent via-red-200/50 to-transparent",
    glow: "bg-red-400/20",
    btn: "border-red-300/80 bg-white/90 text-red-900 hover:border-red-400 hover:bg-red-50",
    btnActive: "border-red-600 bg-red-600 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]",
    qty: "text-red-950",
    animateShine: true,
    animateGlow: false
  },
  slate: {
    tierLabel: "Slate",
    icon: "■",
    swatch: "#475569",
    chartColor: "#475569",
    cardIdle:
      "border-slate-200/90 bg-gradient-to-br from-slate-50 via-white to-zinc-50 shadow-[0_4px_24px_rgba(71,85,105,0.1)]",
    cardActive:
      "border-slate-400/90 bg-gradient-to-br from-slate-100/90 via-white to-zinc-100 ring-2 ring-slate-300/70 shadow-[0_8px_32px_rgba(71,85,105,0.22)]",
    badge: "bg-gradient-to-r from-slate-700 to-slate-500 text-white shadow-[0_2px_12px_rgba(71,85,105,0.35)]",
    price: "text-slate-900",
    priceMuted: "text-slate-600/80",
    title: "text-slate-900",
    desc: "text-slate-600",
    lineTotal: "text-slate-800",
    shine: "from-transparent via-slate-200/50 to-transparent",
    glow: "bg-slate-400/20",
    btn: "border-slate-300/80 bg-white/90 text-slate-900 hover:border-slate-400 hover:bg-slate-50",
    btnActive: "border-slate-700 bg-slate-800 text-white shadow-[0_0_20px_rgba(71,85,105,0.35)]",
    qty: "text-slate-950",
    animateShine: false,
    animateGlow: false
  }
};

export const TIER_PALETTE_OPTIONS = [
  { key: "", label: "Auto", swatch: "conic-gradient(from 180deg, #0ea5e9, #8b5cf6, #f59e0b, #f43f5e, #0ea5e9)" },
  { key: "standard", label: "Sky", swatch: PALETTES.standard.swatch },
  { key: "premium", label: "Violet", swatch: PALETTES.premium.swatch },
  { key: "luxe", label: "Gold", swatch: PALETTES.luxe.swatch },
  { key: "rose", label: "Rose", swatch: PALETTES.rose.swatch },
  { key: "emerald", label: "Emerald", swatch: PALETTES.emerald.swatch },
  { key: "indigo", label: "Indigo", swatch: PALETTES.indigo.swatch },
  { key: "coral", label: "Coral", swatch: PALETTES.coral.swatch },
  { key: "teal", label: "Teal", swatch: PALETTES.teal.swatch },
  { key: "crimson", label: "Crimson", swatch: PALETTES.crimson.swatch },
  { key: "slate", label: "Slate", swatch: PALETTES.slate.swatch }
];

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

export function normalizeTierHex(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/^#?([0-9a-f]{6})$/i);
  if (!match) {
    return null;
  }
  return `#${match[1].toUpperCase()}`;
}

export function normalizeTierColorKey(value) {
  const key = String(value || "").trim().toLowerCase();
  if (!key || key === "auto") {
    return "";
  }
  if (key === "custom") {
    return "custom";
  }
  return PALETTES[key] ? key : "";
}

function hexToRgb(hex) {
  const normalized = normalizeTierHex(hex);
  if (!normalized) {
    return null;
  }
  return {
    r: parseInt(normalized.slice(1, 3), 16),
    g: parseInt(normalized.slice(3, 5), 16),
    b: parseInt(normalized.slice(5, 7), 16)
  };
}

function relativeLuminance({ r, g, b }) {
  const lin = (c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

export function paletteFromHex(hex) {
  const rgb = hexToRgb(hex);
  const normalized = normalizeTierHex(hex);
  if (!rgb || !normalized) {
    return null;
  }
  const { r, g, b } = rgb;
  const rgba = (a) => `rgba(${r}, ${g}, ${b}, ${a})`;
  const badgeText = relativeLuminance(rgb) > 0.62 ? "#1e293b" : "#ffffff";
  return {
    key: "custom",
    hex: normalized,
    useInline: true,
    tierLabel: "Custom",
    icon: "●",
    swatch: normalized,
    chartColor: normalized,
    cardIdle: "border bg-white shadow-sm",
    cardActive: "ring-2 shadow-lg",
    badge: "font-bold shadow-sm",
    price: "font-extrabold",
    priceMuted: "opacity-80",
    title: "text-slate-900",
    desc: "text-slate-600",
    lineTotal: "font-bold",
    shine: "",
    glow: "",
    btn: "border-2 bg-white",
    btnActive: "border-2 text-white",
    qty: "font-extrabold",
    animateShine: true,
    animateGlow: true,
    styles: {
      cardIdle: {
        borderColor: rgba(0.38),
        background: `linear-gradient(160deg, ${rgba(0.16)} 0%, #ffffff 58%)`,
        boxShadow: `0 4px 24px ${rgba(0.14)}`
      },
      cardActive: {
        borderColor: rgba(0.72),
        background: `linear-gradient(160deg, ${rgba(0.24)} 0%, #ffffff 52%)`,
        boxShadow: `0 10px 36px ${rgba(0.3)}`
      },
      badge: {
        background: `linear-gradient(90deg, ${normalized}, ${rgba(0.82)})`,
        color: badgeText,
        boxShadow: `0 2px 12px ${rgba(0.42)}`
      },
      price: { color: normalized },
      priceMuted: { color: rgba(0.78) },
      lineTotal: { color: normalized },
      qty: { color: normalized },
      glow: { background: rgba(0.28) },
      btn: { borderColor: rgba(0.45), color: normalized },
      btnActive: { borderColor: normalized, background: normalized, color: badgeText }
    }
  };
}

/**
 * @param {{ name?: string, price?: number, color_key?: string, color?: string }} level
 * @param {number} index — position in displayed list
 * @param {{ name?: string, price?: number }[]} allLevels
 */
export function resolveTicketLevelPalette(level, index, allLevels = []) {
  const colorKey = normalizeTierColorKey(level?.color_key);
  if (colorKey === "custom") {
    const custom = paletteFromHex(level?.color);
    if (custom) {
      return custom;
    }
  } else if (colorKey && PALETTES[colorKey]) {
    return { key: colorKey, ...PALETTES[colorKey] };
  }

  const customHex = normalizeTierHex(level?.color);
  if (customHex) {
    const custom = paletteFromHex(customHex);
    if (custom) {
      return custom;
    }
  }

  const byName = paletteKeyFromName(level?.name);
  if (byName) {
    return { key: byName, ...PALETTES[byName] };
  }

  const sorted = [...(allLevels || [])].sort((a, b) => Number(a?.price || 0) - Number(b?.price || 0));
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
  rose: "#f43f5e",
  emerald: "#10b981",
  indigo: "#6366f1",
  coral: "#f97316",
  teal: "#14b8a6",
  crimson: "#dc2626",
  slate: "#475569",
  custom: "#64748b",
  other: "#64748b"
};

export { PALETTES };
