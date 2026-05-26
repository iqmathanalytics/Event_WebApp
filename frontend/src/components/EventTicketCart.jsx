import { Minus, Plus, Sparkles } from "lucide-react";
import { formatCurrency } from "../utils/format";
import { cartTicketCount, computeCartSubtotal } from "../utils/eventTicketLevels";
import { trackTicketTierCart } from "../utils/googleAnalytics";
import { resolveTicketLevelPalette } from "../utils/ticketLevelPalettes";

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
    const cap = maxTickets > 0 ? maxTickets : 50;
    const others = ticketTotal - (Number(cart[levelId]) || 0);
    const allowed = Math.max(0, cap - others);
    const qty = Math.max(0, Math.min(allowed, next));
    const prevQty = Number(cart[levelId]) || 0;
    onChange({ ...cart, [levelId]: qty });
    if (eventId && qty > prevQty) {
      const level = levelList.find((l) => l.id === levelId);
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
          const lineTotal = Number(level.price || 0) * qty * Math.max(1, totalDays);
          const palette = resolveTicketLevelPalette(level, index, levelList);
          const isLuxe = palette.key === "luxe";

          return (
            <div
              key={level.id}
              className={`ticket-tier-card rounded-2xl border p-3.5 transition-all duration-300 sm:p-4 ${
                active ? `ticket-tier-card--active ${palette.cardActive}` : palette.cardIdle
              }`}
            >
              {(palette.animateShine || active) ? (
                <div
                  className={`ticket-tier-shine ${palette.animateShine ? "ticket-tier-shine--fast" : ""}`}
                  aria-hidden
                />
              ) : null}
              {palette.animateGlow && active ? (
                <div className={`ticket-tier-glow ${palette.glow}`} aria-hidden />
              ) : null}

              <div className="relative z-[2] flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${palette.badge}`}
                    >
                      {isLuxe ? <Sparkles className="h-3 w-3 shrink-0" strokeWidth={2.5} /> : null}
                      <span className="opacity-90">{palette.icon}</span>
                      {palette.tierLabel}
                    </span>
                  </div>
                  <p className={`text-base font-bold tracking-tight ${palette.title}`}>{level.name}</p>
                  {level.description ? (
                    <p className={`mt-1 text-xs leading-relaxed ${palette.desc}`}>{level.description}</p>
                  ) : null}
                  <p className={`mt-2 text-lg font-extrabold tabular-nums ${palette.price}`}>
                    {formatCurrency(level.price)}
                    <span className={`ml-1.5 text-xs font-semibold ${palette.priceMuted}`}>per ticket</span>
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      disabled={disabled || qty <= 0}
                      onClick={() => setQty(level.id, qty - 1)}
                      aria-label={`Remove one ${level.name}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 disabled:opacity-35 ${
                        active ? palette.btnActive : palette.btn
                      }`}
                    >
                      <Minus className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                    <span
                      className={`min-w-[2.25rem] text-center text-base font-extrabold tabular-nums ${palette.qty}`}
                    >
                      {qty}
                    </span>
                    <button
                      type="button"
                      disabled={disabled || ticketTotal >= (maxTickets > 0 ? maxTickets : 50)}
                      onClick={() => setQty(level.id, qty + 1)}
                      aria-label={`Add one ${level.name}`}
                      className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-all duration-200 disabled:opacity-35 ${
                        active ? palette.btnActive : palette.btn
                      }`}
                    >
                      <Plus className="h-4 w-4" strokeWidth={2.5} />
                    </button>
                  </div>
                  {active ? (
                    <p className={`text-xs font-bold tabular-nums ${palette.lineTotal}`}>
                      {formatCurrency(lineTotal)}
                      {totalDays > 1 ? ` · ${totalDays}d` : ""}
                    </p>
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
