import { motion, useReducedMotion } from "framer-motion";
import { FiLock, FiYoutube } from "react-icons/fi";

export default function GuestPromoVideoCard({ promoCount }) {
  const reduceMotion = useReducedMotion();
  const countLabel = promoCount === 1 ? "1 promo video" : `${promoCount} promo videos`;

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="guest-promo-card relative overflow-hidden rounded-2xl border border-rose-200/90 bg-gradient-to-br from-rose-50/95 via-white to-amber-50/50 p-4 shadow-[0_16px_40px_-20px_rgba(225,29,72,0.45)] lg:rounded-2xl lg:p-5"
    >
      <span className="guest-promo-card-sheen pointer-events-none absolute inset-0" aria-hidden />

      <motion.div
        className="guest-promo-unlock-tag relative z-[1] mb-3 inline-flex max-w-full items-center gap-2 rounded-full px-3 py-1.5 sm:px-3.5 sm:py-2"
        animate={reduceMotion ? undefined : { y: [0, -2.5, 0], scale: [1, 1.02, 1] }}
        transition={reduceMotion ? undefined : { duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden>
          <span className="guest-promo-tag-dot absolute inline-flex h-full w-full rounded-full bg-white" />
          <span className="guest-promo-tag-ping absolute inline-flex h-full w-full rounded-full bg-white/80" />
        </span>
        <FiLock className="h-3.5 w-3.5 shrink-0 text-white/95" aria-hidden />
        <span className="guest-promo-tag-shine-text text-[11px] font-extrabold uppercase tracking-[0.12em] text-white sm:text-xs sm:tracking-[0.14em]">
          Login or register to watch
        </span>
      </motion.div>

      <div className="relative z-[1] flex items-start gap-3">
        <motion.span
          className="mt-0.5 grid h-10 w-10 shrink-0 place-content-center rounded-xl bg-white text-rose-600 shadow-sm ring-1 ring-rose-100"
          animate={reduceMotion ? undefined : { scale: [1, 1.06, 1] }}
          transition={reduceMotion ? undefined : { duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <FiYoutube className="h-5 w-5" aria-hidden />
        </motion.span>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-slate-900 lg:text-base">Promo video</h2>
          <p className="mt-1 text-[15px] leading-relaxed text-slate-700 lg:text-sm">
            This event includes {countLabel}. Unlock the full experience and press play right on this page.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
