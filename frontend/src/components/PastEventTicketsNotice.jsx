import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarHeart, PartyPopper, Sparkles, Ticket } from "lucide-react";
import { BRAND_NAME } from "../constants/brand";

/**
 * Friendly closed-cart state when all show dates are in the past.
 */
export default function PastEventTicketsNotice() {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_6px_20px_rgba(0,0,0,0.08)] ring-1 ring-slate-900/[0.04]">
      <div className="p-5 max-lg:pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:p-6">
        <div className="-mt-1 mb-4 flex justify-center sm:-mt-2">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm">
            <Ticket className="shrink-0 text-rose-500" size={14} strokeWidth={2} aria-hidden />
            Curtain already closed
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-b from-rose-50/90 via-white to-slate-50 px-3 py-8 text-center sm:px-5">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage:
                "radial-gradient(circle at 20% 20%, rgba(225,29,72,0.12), transparent 42%), radial-gradient(circle at 80% 10%, rgba(15,23,42,0.06), transparent 36%)"
            }}
            aria-hidden
          />
          <div className="relative mx-auto mb-5 flex h-24 w-40 items-center justify-center">
            <motion.span
              className="absolute left-2 top-2 text-amber-500"
              animate={{ y: [0, -8, 0], rotate: [-8, 8, -8], opacity: [0.55, 1, 0.55] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
              aria-hidden
            >
              <Sparkles size={18} strokeWidth={2.2} />
            </motion.span>
            <motion.span
              className="absolute right-1 top-1 text-rose-400"
              animate={{ y: [0, -10, 0], rotate: [10, -6, 10], scale: [0.92, 1.08, 0.92] }}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
              aria-hidden
            >
              <PartyPopper size={20} strokeWidth={2.1} />
            </motion.span>
            <motion.div
              className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-[0_10px_28px_rgba(225,29,72,0.18)] ring-1 ring-rose-100"
              animate={{ y: [0, -6, 0] }}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            >
              <CalendarHeart className="text-rose-500" size={30} strokeWidth={1.9} aria-hidden />
            </motion.div>
            <motion.span
              className="absolute bottom-1 left-6 text-slate-400"
              animate={{ y: [0, 6, 0], rotate: [0, -12, 0], opacity: [0.45, 0.9, 0.45] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.35 }}
              aria-hidden
            >
              <Ticket size={18} strokeWidth={2} />
            </motion.span>
          </div>
          <h3 className="relative text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
            This event has already taken place
          </h3>
          <p className="relative mx-auto mt-2 max-w-sm text-sm leading-relaxed text-slate-600">
            Thanks for stopping by — the ticket cart is closed now that the show dates have passed. Catch the next
            night out on {BRAND_NAME}.
          </p>
          <Link
            to="/events"
            className="relative mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Browse upcoming events
          </Link>
        </div>
      </div>
    </div>
  );
}
