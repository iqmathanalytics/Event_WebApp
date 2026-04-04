import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import useAuth from "../hooks/useAuth";

function LogoutOverlay() {
  const { isLoggingOut } = useAuth();
  const reduceMotion = useReducedMotion();

  const enter = reduceMotion ? { duration: 0.15 } : { duration: 0.38, ease: [0.22, 1, 0.36, 1] };
  const exit = reduceMotion ? { duration: 0.12 } : { duration: 0.42, ease: [0.16, 1, 0.3, 1] };

  return (
    <AnimatePresence>
      {isLoggingOut ? (
        <motion.div
          key="logout-overlay"
          role="status"
          aria-live="polite"
          aria-label="Signing out"
          className="fixed inset-0 z-[9998] flex cursor-wait items-center justify-center bg-gradient-to-b from-white/92 via-white/88 to-slate-50/92 backdrop-blur-md"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={enter}
        >
          <motion.div
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.94, y: reduceMotion ? 0 : 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 4 }}
            transition={exit}
            className="pointer-events-none rounded-2xl border border-slate-200/90 bg-white/95 px-8 py-5 shadow-2xl shadow-slate-900/12 ring-1 ring-slate-900/[0.04]"
          >
            <div className="flex flex-col items-center gap-3">
              <motion.span
                className="grid h-11 w-11 place-content-center rounded-2xl bg-gradient-to-br from-slate-900 to-slate-700 text-lg text-white shadow-lg"
                animate={
                  reduceMotion
                    ? {}
                    : {
                        scale: [1, 1.06, 1],
                        rotate: [0, -6, 4, 0]
                      }
                }
                transition={reduceMotion ? {} : { duration: 0.75, ease: [0.22, 1, 0.36, 1] }}
                aria-hidden
              >
                ✓
              </motion.span>
              <p className="text-center text-sm font-semibold tracking-tight text-slate-800">Signing you out…</p>
              <p className="text-center text-xs text-slate-500">See you soon.</p>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export default LogoutOverlay;
