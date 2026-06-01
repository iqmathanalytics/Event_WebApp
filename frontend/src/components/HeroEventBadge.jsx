import { motion } from "framer-motion";

export function heroBadgeMeta(variant = "featured") {
  if (variant === "yay") {
    return {
      label: "Spotlight event",
      labelCompact: "Spotlight",
      subLabel: "Members-only perks",
      gradient: "from-amber-400/90 via-rose-500/90 to-fuchsia-500/90"
    };
  }
  return {
    label: "Featured Event",
    labelCompact: "Featured",
    subLabel: "Handpicked for you",
    gradient: "from-indigo-400/90 via-fuchsia-500/90 to-rose-500/90"
  };
}

export default function HeroEventBadge({ variant = "featured", compact = false, alignActions = false }) {
  const meta = heroBadgeMeta(variant);
  const { subLabel, gradient } = meta;
  const label = meta.label;
  const actionRow = alignActions || compact;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`group relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 backdrop-blur ${
        actionRow
          ? "h-9 px-3.5 sm:px-4 lg:h-9 lg:px-3.5"
          : "px-3 py-1.5 sm:px-3.5 sm:py-2"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-95">
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient}`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.35),transparent_55%)]" />
      </div>
      <div className={`relative ${actionRow ? "" : "text-center"}`}>
        <p
          className={`whitespace-nowrap font-extrabold uppercase tracking-[0.08em] text-white drop-shadow ${
            actionRow ? "text-xs leading-none" : "text-[10px] sm:text-[11px]"
          }`}
        >
          {label}
        </p>
        {!actionRow ? (
          <p className="mt-0.5 hidden text-[9px] font-semibold text-white/90 drop-shadow-sm sm:block sm:text-[10px]">
            {subLabel}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}
