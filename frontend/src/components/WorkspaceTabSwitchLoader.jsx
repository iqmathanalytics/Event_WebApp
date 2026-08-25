import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const ease = [0.22, 1, 0.36, 1];

/**
 * Compact in-panel loader for host workspace tab switches.
 * Soft fade in/out — not a full-page overlay.
 */
export default function WorkspaceTabSwitchLoader({
  show,
  label = "Loading",
  className = ""
}) {
  const reduceMotion = useReducedMotion();
  const fadeMs = reduceMotion ? 0.12 : 0.28;

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          key="workspace-tab-loader"
          className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center ${className}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: fadeMs, ease }}
          role="status"
          aria-live="polite"
          aria-label={label}
        >
          <motion.div
            className="absolute inset-0 rounded-2xl bg-white/70 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: fadeMs, ease }}
          />
          <motion.div
            className="relative flex flex-col items-center gap-2.5"
            initial={{ opacity: 0, y: 6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.98 }}
            transition={{ duration: fadeMs + 0.04, ease }}
          >
            <span className="relative flex h-9 w-9 items-center justify-center">
              <span className="absolute inset-0 rounded-full bg-slate-900/5" />
              <motion.span
                className="h-8 w-8 rounded-full border-2 border-slate-200 border-t-slate-800"
                animate={reduceMotion ? undefined : { rotate: 360 }}
                transition={
                  reduceMotion
                    ? undefined
                    : { duration: 0.75, repeat: Infinity, ease: "linear" }
                }
              />
            </span>
            <span className="text-[11px] font-semibold tracking-wide text-slate-600">{label}</span>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
