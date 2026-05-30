import { motion } from "framer-motion";

export function heroBadgeMeta(variant = "featured") {
  if (variant === "yay") {
    return {
      label: "Spotlight event",
      subLabel: "Members-only perks",
      gradient: "from-amber-400/90 via-rose-500/90 to-fuchsia-500/90"
    };
  }
  return {
    label: "Featured Event",
    subLabel: "Handpicked for you",
    gradient: "from-indigo-400/90 via-fuchsia-500/90 to-rose-500/90"
  };
}

export default function HeroEventBadge({ variant = "featured", compact = false }) {
  const { label, subLabel, gradient } = heroBadgeMeta(variant);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={`group relative shrink-0 overflow-hidden rounded-full border border-white/20 bg-white/10 backdrop-blur ${
        compact ? "px-2.5 py-1" : "px-3 py-1.5 sm:px-3.5 sm:py-2"
      }`}
    >
      <div className="pointer-events-none absolute inset-0 opacity-95">
        <div className={`absolute inset-0 bg-gradient-to-r ${gradient}`} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_15%,rgba(255,255,255,0.35),transparent_55%)]" />
      </div>
      <div className="relative">
        <p
          className={`font-extrabold uppercase tracking-[0.1em] text-white drop-shadow ${
            compact ? "text-[9px] sm:text-[10px]" : "text-[10px] sm:text-[11px]"
          }`}
        >
          {label}
        </p>
        {!compact ? (
          <p className="mt-0.5 hidden text-[9px] font-semibold text-white/90 drop-shadow-sm sm:block sm:text-[10px]">
            {subLabel}
          </p>
        ) : null}
      </div>
    </motion.div>
  );
}
