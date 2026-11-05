import { Sparkles } from "lucide-react";

/**
 * Animated chip for admin-pinned homepage events.
 * compact: icon-only on mobile, full “Spotlight” label from sm+.
 */
export default function HomeSpotlightChip({ compact = false, className = "" }) {
  return (
    <span
      role="img"
      aria-label="Spotlight"
      title="Spotlight"
      className={`home-spotlight-chip inline-flex items-center font-extrabold uppercase tracking-wide text-amber-950 shadow-md ${
        compact
          ? "home-spotlight-chip--icon h-7 w-7 justify-center gap-0 rounded-full p-0 sm:h-auto sm:w-auto sm:gap-1 sm:rounded-full sm:px-1.5 sm:py-0.5 sm:text-[11px]"
          : "gap-1 rounded-full border border-amber-300/90 px-2.5 py-0.5 text-[10px] sm:text-[11px]"
      } ${className}`}
    >
      <Sparkles
        className={`home-spotlight-chip__icon shrink-0 ${compact ? "h-3.5 w-3.5 sm:h-3 sm:w-3" : "h-3 w-3"}`}
        strokeWidth={2.6}
        aria-hidden
      />
      <span className={`relative z-[1] ${compact ? "hidden sm:inline" : ""}`}>Spotlight</span>
    </span>
  );
}
