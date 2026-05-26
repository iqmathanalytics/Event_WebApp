import { motion } from "framer-motion";
import { Users } from "lucide-react";
import { getEventSeatStats } from "../utils/eventSeats";

function barTone(fillPercent, soldOut) {
  if (soldOut) {
    return "from-rose-500 via-rose-600 to-rose-700";
  }
  if (fillPercent >= 90) {
    return "from-amber-400 via-orange-500 to-rose-500";
  }
  if (fillPercent >= 65) {
    return "from-brand-500 via-violet-500 to-fuchsia-500";
  }
  return "from-emerald-500 via-brand-500 to-violet-500";
}

/**
 * Visual seat fill indicator for platform (on-site) ticket events.
 */
export default function SeatsAvailabilityBar({ event, variant = "card" }) {
  const stats = getEventSeatStats(event);
  if (!stats.hasCapacity) {
    return null;
  }

  const tone = barTone(stats.fillPercent, stats.soldOut);
  const compact = variant === "compact";

  return (
    <div
      className={
        compact
          ? "rounded-xl border border-slate-200/90 bg-slate-50/90 px-3 py-2.5"
          : "border-b border-slate-100 bg-gradient-to-br from-slate-50/95 via-white to-brand-50/30 px-4 py-3.5 sm:px-5"
      }
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-content-center rounded-lg bg-white text-brand-600 shadow-sm ring-1 ring-slate-200/80">
            <Users className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Seat availability</p>
            <p className="truncate text-sm font-semibold text-slate-900">
              {stats.soldOut ? (
                "Sold out"
              ) : (
                <>
                  <span className="tabular-nums">{stats.remaining}</span>
                  <span className="font-medium text-slate-600">
                    {" "}
                    of {stats.total} seats left
                  </span>
                </>
              )}
            </p>
          </div>
        </div>
        <p className="shrink-0 text-right text-xs font-semibold tabular-nums text-slate-600">
          {stats.booked}/{stats.total}
          <span className="block text-[10px] font-medium uppercase tracking-wide text-slate-400">filled</span>
        </p>
      </div>

      <div className="mt-2.5 h-2 overflow-hidden rounded-full bg-slate-200/90 shadow-inner">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${tone}`}
          initial={{ width: 0 }}
          animate={{ width: `${stats.fillPercent}%` }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          role="progressbar"
          aria-valuenow={stats.fillPercent}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`${stats.fillPercent}% of seats booked`}
        />
      </div>
      {!compact ? (
        <p className="mt-2 text-[11px] leading-snug text-slate-500">
          {stats.soldOut
            ? "All seats are currently reserved. Check back if more are released."
            : `${stats.booked} seat${stats.booked === 1 ? "" : "s"} already booked · ${stats.remaining} available for your party`}
        </p>
      ) : null}
    </div>
  );
}
