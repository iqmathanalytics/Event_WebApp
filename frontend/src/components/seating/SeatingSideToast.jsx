import { AnimatePresence, motion } from "framer-motion";
import { createPortal } from "react-dom";

const TONE_CLASS = {
  success: "border-emerald-200/90 bg-emerald-50 text-emerald-950",
  warn: "border-amber-200/90 bg-amber-50 text-amber-950",
  error: "border-rose-200/90 bg-rose-50 text-rose-950",
  info: "border-slate-200 bg-white text-slate-800"
};

/**
 * Top-right slide overlay toast. Pass null to dismiss (AnimatePresence plays exit).
 */
export default function SeatingSideToast({ toast }) {
  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[500] flex justify-end p-3 sm:p-4">
      <AnimatePresence mode="wait">
        {toast ? (
          <motion.div
            key={toast.id}
            role="status"
            aria-live="polite"
            initial={{ x: 56, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 72, opacity: 0 }}
            transition={{ type: "spring", stiffness: 420, damping: 32, mass: 0.7 }}
            className={`pointer-events-none w-[min(17.5rem,calc(100vw-1.5rem))] rounded-xl border px-3.5 py-2.5 text-[12.5px] leading-snug shadow-[0_10px_28px_rgba(15,23,42,0.16)] ${
              TONE_CLASS[toast.tone] || TONE_CLASS.info
            }`}
          >
            {toast.message}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>,
    document.body
  );
}
