import { Minus, Plus, Sparkles } from "lucide-react";
import { formatCurrency, formatDateUS } from "../utils/format";
import { cartTicketCount, computeCartSubtotal } from "../utils/eventTicketLevels";
import { trackTicketTierCart } from "../utils/googleAnalytics";
import { resolveTicketLevelPalette } from "../utils/ticketLevelPalettes";

function levelMetaLine(level) {
  const parts = [];
  if (level.valid_upto) {
    parts.push(`Valid through ${formatDateUS(level.valid_upto)}`);
  }
  if (level.level_sold_out) {
    parts.push("Sold out");
  } else if (level.level_seats_remaining != null) {
    const n = Number(level.level_seats_remaining);
    parts.push(`${n} seat${n === 1 ? "" : "s"} left`);
  } else if (level.seats != null) {
    parts.push(`${level.seats} seats`);
  }
  return parts.join(" · ");
}

export default function EventTicketCart({
  levels,
  cart,
  onChange,
  totalDays = 1,
  maxTickets = 50,
  disabled = false,
  eventId = null
}) {
  const ticketTotal = cartTicketCount(cart);
  const subtotal = computeCartSubtotal(levels, cart, totalDays);
  const levelList = levels || [];

  const setQty = (levelId, next) => {
    const level = levelList.find((l) => l.id === levelId);
    if (level?.level_sold_out) {
      return;
    }
    const cap = maxTickets > 0 ? maxTickets : 50;
    const others = ticketTotal - (Number(cart[levelId]) || 0);
    let allowed = Math.max(0, cap - others);
    if (level?.level_seats_remaining != null) {
      allowed = Math.min(allowed, Number(level.level_seats_remaining));
    }
    const qty = Math.max(0, Math.min(allowed, next));
    const prevQty = Number(cart[levelId]) || 0;
    onChange({ ...cart, [levelId]: qty });
    if (eventId && qty > prevQty) {
      const palette = level ? resolveTicketLevelPalette(level, levelList.indexOf(level), levelList) : null;
      trackTicketTierCart({
        eventId,
        levelId,
        levelName: level?.name,
        tierKey: palette?.key,
        quantity: qty - prevQty
      });
    }
  };

  return (
    <div className="ticket-cart space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div>
          <p className="ticket-cart-header-shimmer bg-gradient-to-r from-slate-800 via-amber-700 to-slate-800 bg-clip-text text-[10px] font-bold uppercase tracking-[0.2em] text-transparent">
            Select tickets
          </p>
          <p className="mt-0.5 text-xs text-slate-500">Each tier has its own experience & price</p>
        </div>
        <div className="rounded-full border border-slate-200/90 bg-white/80 px-3 py-1.5 shadow-sm backdrop-blur-sm">
          <p className="text-xs font-semibold tabular-nums text-slate-700">
            <span className="text-slate-900">{ticketTotal}</span> in cart
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="bg-gradient-to-r from-amber-700 to-amber-500 bg-clip-text font-bold text-transparent">
              {formatCurrency(subtotal)}
            </span>
            {totalDays > 1 ? (
              <span className="text-slate-500">
                {" "}
                · {totalDays} days
              </span>
            ) : null}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {levelList.map((level, index) => {
          const qty = Number(cart[level.id]) || 0;
          const active = qty > 0;
          const soldOut = Boolean(level.level_sold_out);
          const lineTotal = Number(level.price || 0) * qty * Math.max(1, totalDays);
          const palette = resolveTicketLevelPalette(level, index, levelList);
          const isLuxe = palette.key === "luxe";
          const meta = levelMetaLine(level);
          const atLevelCap =
            level.level_seats_remaining != null && qty >= Number(level.level_seats_remaining);

          return (
            <div
              key={level.id}
              className={`ticket-tier-card rounded-2xl border p-3.5 transition-all duration-300 sm:p-4 ${
                soldOut
                  ? "border-slate-200 bg-slate-50 opacity-75"
                  : active
                    ? `ticket-tier-card--active ${palette.cardActive}`
                    : palette.cardIdle
              }`}
            >
              {(palette.animateShine || active) && !soldOut ? (
                <div
                  className={`ticket-tier-shine ${palette.animateShine ? "ticket-tier-shine--fast" : ""}`}
                  aria-hidden
                />
              ) : null}
              {palette.animateGlow && active && !soldOut ? (
                <div className={`ticket-tier-glow ${palette.glow}`} aria-hidden />
              ) : null}

              <div className="relative z-[2] flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex max-w-full items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold tracking-wide ${soldOut ? "bg-slate-200 text-slate-600" : palette.badge}`}
                    >
                      {isLuxe && !soldOut ? <Sparkles className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} /> : null}
                      <span className="truncate">{level.name}</span>
                    </span>
                    {soldOut ? (
                      <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        Sold out
                      </span>
                    ) : null}
                  </div>
                  {level.description ? (
                    <p className={`mt-1 text-xs leading-relaxed ${soldOut ? "text-slate-500" : palette.desc}`}>
                      {level.description}
                    </p>
                  ) : null}
                  {meta ? (
                    <p className={`mt-1.5 text-[11px] font-medium ${soldOut ? "text-slate-500" : "text-slate-600"}`}>
                      {meta}
                    </p>
                  ) : null}
                  <p className={`mt-2 text-lg font-extrabold tabular-nums ${soldOut ? "text-slate-500" : palette.price}`}>
                    {formatCurrency(level.price)}
                    <span className={`ml-1.5 text-xs font-semibold ${soldOut ? "text-slate-400" : palette.priceMuted}`}>
                      per ticket
                    </span>
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={disabled || soldOut || qty <= 0}
                      onClick={() => setQty(level.id, qty - 1)}
                      aria-label={`Remove one ${level.name}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 disabled:opacity-35 ${
                        active && !soldOut ? palette.btnActive : palette.btn
                      }`}
                    >
                      <Minus className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                    <span
                      className={`min-w-[2.25rem] text-center text-base font-extrabold tabular-nums ${soldOut ? "text-slate-400" : palette.qty}`}
                    >
                      {qty}
                    </span>
                    <button
                      type="button"
                      disabled={
                        disabled ||
                        soldOut ||
                        ticketTotal >= (maxTickets > 0 ? maxTickets : 50) ||
                        atLevelCap
                      }
                      onClick={() => setQty(level.id, qty + 1)}
                      aria-label={`Add one ${level.name}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 disabled:opacity-35 ${
                        active && !soldOut ? palette.btnActive : palette.btn
                      }`}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                  {active && !soldOut ? (
                    <p className={`text-xs font-bold tabular-nums ${palette.lineTotal}`}>
                      {formatCurrency(lineTotal)}
                      {totalDays > 1 ? ` · ${totalDays}d` : ""}
                    </p>
                  ) : soldOut ? (
                    <p className="text-[10px] font-medium text-slate-500">Unavailable</p>
                  ) : (
                    <p className="text-[10px] font-medium text-slate-400">Tap + to add</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {ticketTotal < 1 ? (
        <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-3 text-center text-xs font-medium text-slate-500">
          Choose at least one ticket to continue
        </p>
      ) : null}
    </div>
  );
}
