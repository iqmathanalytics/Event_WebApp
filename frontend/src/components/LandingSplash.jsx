import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BRAND_LOGO_HANDOFF_DURATION, BRAND_LOGO_HANDOFF_EASE } from "../constants/brandMotion";

const MIN_MS = 1500;
const STALE_MAX_MS = 90000;
const MIN_MS_REDUCED = 560;
const STALE_MAX_MS_REDUCED = 45000;

/** Root splash fades quickly so the landing layer shows through while the flying logo runs (z-300). */
const SPLASH_ROOT_EXIT_DURATION = 0.42;

/**
 * Full-screen intro on the home page: stays until `busy` is false (data + layout ready) + minimum time.
 * `onRevealed` runs the moment the handoff **starts** (same frame as exit begins) so the landing page
 * can cross-fade in under the splash instead of waiting for exit to complete (removes perceived lag).
 */
function LandingSplash({ busy, onRevealed, onExitComplete, headerLogoRef, startLogoFlight }) {
  const reduceMotion = useReducedMotion();
  const minMs = reduceMotion ? MIN_MS_REDUCED : MIN_MS;
  const staleMaxMs = reduceMotion ? STALE_MAX_MS_REDUCED : STALE_MAX_MS;

  const [showSplash, setShowSplash] = useState(true);
  const [handoff, setHandoff] = useState(false);
  /** Hide splash logo the instant we hand off to the flying clone (avoids two visible marks). */
  const [suppressCenterLogo, setSuppressCenterLogo] = useState(false);
  const handoffStartedRef = useRef(false);
  const splashLogoRef = useRef(null);

  const dismissSplash = useCallback(() => {
    if (handoffStartedRef.current) {
      return;
    }
    if (busy) {
      return;
    }
    handoffStartedRef.current = true;
    setHandoff(true);
    onRevealed?.();
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const fromEl = splashLogoRef.current;
        const toEl = headerLogoRef?.current;
        const from = fromEl?.getBoundingClientRect?.();
        const to = toEl?.getBoundingClientRect?.();
        const canFly =
          !reduceMotion &&
          from &&
          to &&
          from.width > 2 &&
          to.width > 2 &&
          typeof startLogoFlight === "function";

        if (canFly) {
          setSuppressCenterLogo(true);
          startLogoFlight({ from, to });
        }
        setShowSplash(false);
      });
    });
  }, [busy, onRevealed, headerLogoRef, startLogoFlight, reduceMotion]);

  useEffect(() => {
    if (!showSplash) {
      return undefined;
    }
    const started = Date.now();
    const tick = () => {
      const elapsed = Date.now() - started;

      if (busy) {
        if (elapsed >= staleMaxMs) {
          dismissSplash();
        }
        return;
      }

      if (elapsed >= minMs) {
        dismissSplash();
      }
    };

    const id = window.setInterval(tick, 48);
    tick();
    return () => window.clearInterval(id);
  }, [showSplash, busy, minMs, staleMaxMs, dismissSplash]);

  const springIn = reduceMotion
    ? { duration: 0.25, ease: "easeOut" }
    : { type: "spring", stiffness: 420, damping: 22, mass: 0.85 };

  const idleWiggle = reduceMotion
    ? {}
    : {
        rotate: [0, -2.2, 2.4, -1.8, 1.6, -1.1, 0],
        y: [0, -5, 4, -3, 3, -2, 0],
        scale: [1, 1.045, 0.985, 1.03, 0.992, 1.018, 1],
        x: [0, 2, -2, 1.5, -1, 0]
      };

  const idleTransition = reduceMotion
    ? { duration: 0.01 }
    : {
        duration: 2.4,
        repeat: Infinity,
        repeatDelay: 0.2,
        ease: "easeInOut"
      };

  const splashRootExit = reduceMotion
    ? { opacity: 0, transition: { duration: 0.22, ease: "easeOut" } }
    : {
        opacity: 0,
        transition: { duration: SPLASH_ROOT_EXIT_DURATION, ease: BRAND_LOGO_HANDOFF_EASE }
      };

  const bgFadeExit = reduceMotion
    ? { opacity: 0, transition: { duration: 0.2 } }
    : { opacity: 0, transition: { duration: 0.4, ease: BRAND_LOGO_HANDOFF_EASE } };

  const logoMotion = handoff || reduceMotion ? { scale: 1, rotate: 0, x: 0, y: 0 } : idleWiggle;
  const logoTransition = handoff
    ? { duration: 0.28, ease: BRAND_LOGO_HANDOFF_EASE }
    : idleTransition;

  return (
    <AnimatePresence mode="sync" onExitComplete={onExitComplete}>
      {showSplash ? (
        <motion.div
          key="landing-splash"
          className="fixed inset-0 z-[200] flex flex-col items-center justify-center overflow-hidden pointer-events-none will-change-[opacity,transform]"
          initial={{ opacity: 1 }}
          exit={splashRootExit}
        >
          {/* Backgrounds fade out — logo is NOT inside this layer so it stays fully visible for layout flight */}
          <motion.div
            className="absolute inset-0"
            initial={{ opacity: 1 }}
            exit={bgFadeExit}
            aria-hidden
          >
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/78 via-slate-950/72 to-slate-950/84" />
            <motion.div
              className="pointer-events-none absolute left-1/2 top-[18%] h-[min(120vw,720px)] w-[min(120vw,720px)] -translate-x-1/2 rounded-full bg-gradient-to-br from-rose-500/38 via-fuchsia-500/32 to-indigo-500/28 blur-[100px] sm:blur-[120px]"
              animate={
                reduceMotion
                  ? { opacity: 0.85 }
                  : { opacity: [0.65, 0.95, 0.72, 0.9, 0.65], scale: [1, 1.08, 1.02, 1.06, 1] }
              }
              transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="pointer-events-none absolute bottom-[-15%] right-[-10%] h-[85vh] w-[85vw] rounded-full bg-gradient-to-tl from-cyan-400/35 via-violet-500/30 to-rose-500/35 blur-[90px] sm:blur-[110px]"
              animate={
                reduceMotion
                  ? { opacity: 0.6 }
                  : { opacity: [0.5, 0.82, 0.55, 0.78, 0.5], x: [0, -20, 10, 0] }
              }
              transition={{ duration: 6.2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.div
              className="pointer-events-none absolute left-[-20%] top-[40%] h-[70vh] w-[70vw] rounded-full bg-gradient-to-r from-amber-400/25 via-rose-500/35 to-purple-600/25 blur-[85px]"
              animate={
                reduceMotion
                  ? { opacity: 0.45 }
                  : { opacity: [0.35, 0.55, 0.4, 0.52, 0.35], y: [0, 24, -12, 0] }
              }
              transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_50%_0%,rgba(255,255,255,0.14),transparent_58%),radial-gradient(ellipse_90%_70%_at_80%_100%,rgba(99,102,241,0.22),transparent_55%),radial-gradient(ellipse_70%_50%_at_10%_90%,rgba(244,63,94,0.18),transparent_50%)]" />
            <div className="absolute inset-0 backdrop-blur-[16px] backdrop-saturate-[1.2]" />
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/12 via-transparent to-slate-950/38 mix-blend-multiply" />
            <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(15,23,42,0.35)_0%,transparent_42%,rgba(15,23,42,0.48)_100%)]" />
          </motion.div>

          <div className="relative z-[1] flex flex-col items-center px-6">
            <span className="sr-only">Loading Yay Tickets</span>

            <motion.div
              className="relative flex items-center justify-center"
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.86, rotate: -4 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={springIn}
            >
              <motion.img
                ref={splashLogoRef}
                src="/branding/yay-tickets-logo.png"
                alt=""
                decoding="async"
                animate={logoMotion}
                transition={logoTransition}
                style={{ willChange: reduceMotion ? "auto" : "transform" }}
                className={`relative z-[1] h-16 w-auto max-w-[200px] object-contain drop-shadow-[0_18px_44px_rgba(0,0,0,0.42)] sm:h-[4.5rem] sm:max-w-[220px] ${
                  suppressCenterLogo ? "pointer-events-none invisible opacity-0" : ""
                }`}
              />
              {!reduceMotion && !handoff ? (
                <>
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-[-35%] rounded-full bg-gradient-to-r from-rose-400/35 via-fuchsia-400/25 to-indigo-400/35 blur-3xl"
                    animate={{ opacity: [0.35, 0.65, 0.4, 0.6, 0.35], scale: [0.92, 1.05, 0.96, 1.02, 0.92] }}
                    transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                  <motion.div
                    aria-hidden
                    className="pointer-events-none absolute inset-[-20%] -z-10 opacity-70 blur-2xl"
                    style={{
                      background:
                        "radial-gradient(circle at 30% 30%, rgba(251,113,133,0.5), transparent 45%), radial-gradient(circle at 70% 60%, rgba(129,140,248,0.45), transparent 50%)"
                    }}
                    animate={{ rotate: [0, 4, -3, 0], scale: [1, 1.06, 1] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                </>
              ) : null}
            </motion.div>

            <motion.div
              initial={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.32, ease: BRAND_LOGO_HANDOFF_EASE }}
              className="flex flex-col items-center"
            >
              <motion.p
                className="mt-10 max-w-xs text-center text-sm font-medium text-white/80 sm:mt-11 sm:text-base"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              >
                {busy ? "Loading events, deals & creators…" : "Almost there…"}
              </motion.p>
              <motion.div
                className="mt-7 flex gap-1.5"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35, duration: 0.4 }}
                aria-hidden
              >
                {[0, 1, 2].map((i) => (
                  <motion.span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-white/55"
                    animate={
                      reduceMotion
                        ? { opacity: 0.5 }
                        : { opacity: [0.3, 1, 0.3], scale: [0.82, 1.2, 0.82], y: [0, -3, 0] }
                    }
                    transition={{
                      duration: 1.15,
                      repeat: Infinity,
                      delay: i * 0.2,
                      ease: "easeInOut"
                    }}
                  />
                ))}
              </motion.div>
            </motion.div>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default LandingSplash;
