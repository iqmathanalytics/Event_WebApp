import { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";

const ease = [0.25, 0.46, 0.45, 0.94];

/**
 * Full-screen loading chrome (logo + orbit rings). Shared by route transitions and in-app workspace opens.
 */
function NavOrbitRings() {
  const gid = useId();
  const gradId = `alo-grad-${gid}`;
  const filterId = `alo-glow-${gid}`;

  const rings = [
    { r: 26, w: 2.75, dur: 2.5, cw: true, dash: "34 220" },
    { r: 42, w: 2.25, dur: 3.35, cw: false, dash: "54 220" },
    { r: 58, w: 2, dur: 4.1, cw: true, dash: "74 220" }
  ];

  return (
    <>
      <motion.div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-rose-500/20 via-fuchsia-400/15 to-indigo-500/20 blur-3xl"
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.85, 0.55] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />
      <svg
        viewBox="0 0 120 120"
        className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="42%" stopColor="#e879f9" />
            <stop offset="100%" stopColor="#a5b4fc" />
          </linearGradient>
          <filter id={filterId} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="0.8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {rings.map(({ r, w, dur, cw, dash }) => (
          <motion.g
            key={`${r}-${cw}`}
            style={{ transformOrigin: "60px 60px" }}
            animate={{ rotate: cw ? 360 : -360 }}
            transition={{ duration: dur, repeat: Infinity, ease: "linear" }}
          >
            <circle
              cx="60"
              cy="60"
              r={r}
              fill="none"
              stroke={`url(#${gradId})`}
              strokeWidth={w}
              strokeLinecap="round"
              strokeDasharray={dash}
              opacity={0.9}
              filter={`url(#${filterId})`}
            />
          </motion.g>
        ))}
      </svg>
    </>
  );
}

export default function AppLoadingOverlay({
  caption = "Just a moment",
  ariaLabel = "Loading",
  zIndexClass = "z-[220]",
  className = "",
  /** When true, skip opacity fade-in so route transitions cover the outgoing frame immediately. */
  instantEnter = false
}) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.div
      role="progressbar"
      aria-busy="true"
      aria-label={ariaLabel}
      initial={{ opacity: instantEnter ? 1 : 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: instantEnter ? 0 : 0.18, ease }}
      className={`pointer-events-auto fixed inset-0 flex flex-col items-center justify-center bg-slate-950/40 backdrop-blur-[12px] backdrop-saturate-150 ${zIndexClass} ${className}`}
    >
      <span className="sr-only" aria-live="polite">
        {ariaLabel}
      </span>

      <div className="relative flex flex-col items-center px-6">
        <div className="relative flex h-[min(52vw,220px)] w-[min(52vw,220px)] items-center justify-center sm:h-[240px] sm:w-[240px]">
          {!reduceMotion ? <NavOrbitRings /> : null}

          <motion.div
            className="relative z-[2] rounded-2xl border border-white/40 bg-white/90 p-4 shadow-2xl ring-1 ring-black/5 backdrop-blur-sm sm:p-5"
            initial={instantEnter ? { scale: 1, opacity: 1 } : { scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={
              instantEnter
                ? { duration: 0 }
                : { type: "spring", stiffness: 400, damping: 30 }
            }
          >
            <img
              src="/branding/yay-tickets-logo.png"
              alt=""
              className="mx-auto h-11 w-auto max-w-[148px] object-contain sm:h-[3.25rem] sm:max-w-[168px]"
              decoding="async"
            />
            {!reduceMotion ? (
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -inset-1 -z-10 rounded-2xl bg-gradient-to-r from-rose-400/30 via-fuchsia-400/25 to-indigo-400/30 blur-md"
                animate={{ opacity: [0.45, 0.9, 0.5] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              />
            ) : null}
          </motion.div>
        </div>

        <motion.p
          className="mt-7 max-w-xs text-center text-xs font-semibold uppercase tracking-[0.26em] text-slate-700 sm:mt-8 sm:text-sm"
          initial={instantEnter ? { opacity: 1, y: 0 } : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={instantEnter ? { duration: 0 } : { delay: 0.05, duration: 0.25, ease }}
        >
          {caption}
        </motion.p>
      </div>
    </motion.div>
  );
}
