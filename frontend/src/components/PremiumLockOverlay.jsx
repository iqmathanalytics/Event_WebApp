import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Flame, Sparkles } from "lucide-react";

const SPARKLE_LAYOUT = [
  { left: "10%", top: "14%", delay: 0, scale: 1 },
  { left: "78%", top: "18%", delay: 0.2, scale: 0.85 },
  { left: "22%", top: "8%", delay: 0.4, scale: 0.7 },
  { left: "88%", top: "42%", delay: 0.1, scale: 1 },
  { left: "6%", top: "48%", delay: 0.35, scale: 0.9 },
  { left: "52%", top: "6%", delay: 0.25, scale: 0.75 },
  { left: "42%", top: "22%", delay: 0.5, scale: 0.6 },
  { left: "92%", top: "68%", delay: 0.15, scale: 0.8 }
];

/**
 * Full-screen lock layer for cards: blur backdrop + promo panel with fire, sparkles, motion.
 * @param {"event" | "deal"} variant
 */
function PremiumLockOverlay({ variant = "deal" }) {
  const isEvent = variant === "event";

  return (
    <>
      <div
        className="absolute inset-0 z-20 bg-gradient-to-b from-slate-900/35 via-transparent to-orange-950/25 backdrop-blur-[2px]"
        aria-hidden="true"
      />

      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-3 sm:p-4">
        <motion.div
          className="premium-lock-panel pointer-events-auto relative w-full max-w-[290px] overflow-hidden rounded-2xl"
          initial={{ opacity: 0, y: 10, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          whileHover={{ scale: 1.04, y: -2 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="premium-lock-flames" aria-hidden>
            <span className="premium-lock-flame" />
            <span className="premium-lock-flame" />
            <span className="premium-lock-flame" />
          </div>

          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
            {SPARKLE_LAYOUT.map((s, i) => (
              <motion.span
                key={`sp-${i}`}
                className="absolute h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_10px_rgba(251,191,36,0.95)]"
                style={{ left: s.left, top: s.top, scale: s.scale }}
                animate={{
                  opacity: [0.35, 1, 0.35],
                  scale: [s.scale * 0.85, s.scale * 1.25, s.scale * 0.85],
                  y: [0, -6, 0]
                }}
                transition={{
                  duration: 2.2 + i * 0.08,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: s.delay
                }}
              />
            ))}
          </div>

          <motion.div
            className="absolute right-2 top-2 text-amber-300/90 drop-shadow-[0_0_8px_rgba(251,191,36,0.8)]"
            animate={{ rotate: [0, 8, -6, 0], scale: [1, 1.15, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            aria-hidden
          >
            <Sparkles className="h-5 w-5" strokeWidth={2.2} />
          </motion.div>

          <div className="relative z-10 px-4 pb-6 pt-5 text-center">
            {isEvent ? (
              <>
                <motion.p
                  className="premium-lock-eyebrow font-['Sora',sans-serif] text-[11px] font-bold uppercase tracking-[0.25em] text-amber-200/90"
                  animate={{ opacity: [0.75, 1, 0.75] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Members only
                </motion.p>
                <h3 className="premium-lock-title mt-2 font-['Sora',sans-serif] text-[1.35rem] font-extrabold leading-[1.15] tracking-tight sm:text-2xl">
                  <span className="premium-lock-title-shine block">Yay!</span>
                  <span className="premium-lock-title-shine-delayed mt-0.5 block text-lg sm:text-xl">Deal Event</span>
                </h3>
              </>
            ) : (
              <>
                <motion.p
                  className="premium-lock-eyebrow font-['Sora',sans-serif] text-[11px] font-bold uppercase tracking-[0.25em] text-amber-200/90"
                  animate={{ opacity: [0.75, 1, 0.75] }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  Exclusive offer
                </motion.p>
                <h3 className="premium-lock-title mt-2 font-['Sora',sans-serif] text-[1.35rem] font-extrabold leading-[1.15] tracking-tight sm:text-2xl">
                  <span className="premium-lock-title-shine block">Premium</span>
                  <span className="premium-lock-title-shine-delayed mt-0.5 block text-lg sm:text-xl">Deal</span>
                </h3>
              </>
            )}

            <motion.p
              className="mt-2.5 text-xs leading-snug text-white/85"
              animate={{ opacity: [0.85, 1, 0.85] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              {isEvent
                ? "Unlock the full scoop & your discount code — one tap away."
                : "Unlock savings, promo & link — your cart will thank you."}
            </motion.p>

            <div className="mt-1 flex items-center justify-center gap-1 text-[10px] font-medium text-amber-200/80">
              <motion.span
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Flame className="h-3.5 w-3.5 text-orange-400" aria-hidden />
              </motion.span>
              <span className="premium-lock-pulse-text">Tap below to unlock</span>
              <motion.span
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: 0.15 }}
              >
                <Flame className="h-3.5 w-3.5 text-orange-400" aria-hidden />
              </motion.span>
            </div>

            <Link
              to="/login"
              className="premium-lock-cta mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-white shadow-lg outline-none ring-2 ring-transparent transition-[transform,box-shadow] hover:shadow-orange-500/40 focus-visible:ring-amber-300/80"
            >
              <Sparkles className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
              Login to Unlock
              <Flame className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
            </Link>
          </div>
        </motion.div>
      </div>
    </>
  );
}

export default PremiumLockOverlay;
