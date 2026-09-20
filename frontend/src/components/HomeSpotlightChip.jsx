import { Sparkles } from "lucide-react";

/**
 * Animated chip for admin-pinned homepage events.
 */
export default function HomeSpotlightChip({ compact = false, className = "" }) {
  return (
    <span
      className={`home-spotlight-chip inline-flex items-center gap-1 rounded-full border border-amber-300/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-amber-950 shadow-md sm:text-[11px] ${
        compact ? "px-1.5" : "px-2.5"
      } ${className}`}
    >
      <Sparkles className="home-spotlight-chip__icon h-3 w-3 shrink-0" strokeWidth={2.6} aria-hidden />
      <span className="relative z-[1]">Spotlight</span>
    </span>
  );
}
