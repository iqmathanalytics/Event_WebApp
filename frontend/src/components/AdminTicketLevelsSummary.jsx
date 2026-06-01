import { formatCurrency, formatDateUS } from "../utils/format";
import { parseTicketLevelsFromEvent } from "../utils/eventTicketLevels";

export default function AdminTicketLevelsSummary({ event, className = "" }) {
  const levels = parseTicketLevelsFromEvent(event);

  if (!levels.length) {
    return (
      <div className={`rounded-xl border border-dashed border-slate-300 bg-slate-50/80 px-4 py-3 text-sm text-slate-600 ${className}`}>
        No ticket levels configured.
        {Number(event?.price) > 0 ? (
          <span className="mt-1 block">
            Listing price: <span className="font-semibold text-slate-800">{formatCurrency(event.price)}</span>
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Ticket levels</p>
      {levels.map((level) => (
        <div
          key={level.id}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm ring-1 ring-slate-900/[0.03]"
        >
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-semibold text-slate-900">{level.name}</p>
            <p className="shrink-0 text-sm font-bold tabular-nums text-slate-900">{formatCurrency(level.price)}</p>
          </div>
          {level.description ? (
            <p className="mt-1 text-xs leading-relaxed text-slate-600">{level.description}</p>
          ) : null}
          <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-medium text-slate-600">
            {level.seats != null ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5">
                {level.level_booked != null
                  ? `${level.level_booked} / ${level.seats} seats booked`
                  : `${level.seats} seats`}
              </span>
            ) : (
              <span className="rounded-full bg-slate-100 px-2 py-0.5">Unlimited seats</span>
            )}
            {level.valid_upto ? (
              <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-900">
                Valid through {formatDateUS(level.valid_upto)}
              </span>
            ) : null}
            {level.level_sold_out ? (
              <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700">Sold out</span>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
