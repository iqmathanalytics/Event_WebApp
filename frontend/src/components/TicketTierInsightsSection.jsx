import { Sparkles } from "lucide-react";
import { resolveTicketLevelPalette } from "../utils/ticketLevelPalettes";
import { formatCurrency } from "../utils/format";
import { TierHorizontalBarChart } from "./insights/InsightsCharts";

function TierStatCard({ tier, configuredLevels }) {
  const level = configuredLevels.find((l) => String(l.id) === String(tier.level_id)) || {
    id: tier.level_id,
    name: tier.level_name,
    price: tier.unit_price
  };
  const idx = configuredLevels.findIndex((l) => String(l.id) === String(tier.level_id));
  const palette = resolveTicketLevelPalette(level, idx >= 0 ? idx : 0, configuredLevels);
  const isLuxe = tier.tier_key === "luxe" || palette.key === "luxe";

  return (
    <div
      className={`ticket-tier-card rounded-2xl border p-4 transition hover:shadow-md ${palette.cardIdle}`}
      style={{ borderColor: `${tier.color}44` }}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${palette.badge}`}>
          {isLuxe ? <Sparkles className="h-3 w-3" /> : null}
          {palette.tierLabel}
        </span>
        <span className="text-[10px] font-semibold tabular-nums text-slate-500">
          {tier.share_tickets_pct}% of tickets
        </span>
      </div>
      <p className={`mt-2 text-base font-bold ${palette.title}`}>{tier.level_name}</p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div className="rounded-lg bg-white/70 px-2.5 py-2 ring-1 ring-black/[0.04]">
          <p className="text-[10px] font-bold uppercase text-slate-500">Tickets sold</p>
          <p className={`text-xl font-bold tabular-nums ${palette.qty}`}>{tier.tickets_sold}</p>
        </div>
        <div className="rounded-lg bg-white/70 px-2.5 py-2 ring-1 ring-black/[0.04]">
          <p className="text-[10px] font-bold uppercase text-slate-500">Revenue</p>
          <p className={`text-lg font-bold tabular-nums ${palette.price}`}>{formatCurrency(tier.gross_revenue)}</p>
        </div>
      </div>
      <p className="mt-2 text-[11px] text-slate-600">
        {tier.booking_count} booking{tier.booking_count === 1 ? "" : "s"} · {formatCurrency(tier.unit_price)} each
        {tier.share_revenue_pct > 0 ? ` · ${tier.share_revenue_pct}% of tier revenue` : ""}
      </p>
    </div>
  );
}

export default function TicketTierInsightsSection({ bookings, eventLevels = [] }) {
  const tiers = bookings?.tiers || [];
  const configured =
    (bookings?.configured_levels?.length ? bookings.configured_levels : eventLevels) || [];

  const ticketsChart = tiers.map((t) => ({
    name: t.level_name,
    value: t.tickets_sold,
    fill: t.color
  }));

  const revenueChart = tiers.map((t) => ({
    name: t.level_name,
    value: t.gross_revenue,
    fill: t.color
  }));

  if (!configured.length && !tiers.length) {
    return (
      <p className="text-sm text-slate-500">
        No ticket tiers configured for this event. Add levels under on-site ticketing to see tier breakdown here.
      </p>
    );
  }

  if (!tiers.length) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-slate-600">
          Ticket tiers are set up for this event. Sales by tier will appear after guests complete bookings.
        </p>
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {configured.map((level, index) => {
            const palette = resolveTicketLevelPalette(level, index, configured);
            return (
              <li
                key={level.id}
                className={`rounded-xl border px-3 py-2.5 text-sm ${palette.cardIdle}`}
              >
                <p className="font-semibold text-slate-900">{level.name}</p>
                <p className={`mt-0.5 font-bold tabular-nums ${palette.price}`}>{formatCurrency(level.price)}</p>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-slate-600">
        Breakdown of paid and complimentary bookings by ticket tier (General, Premium, VIP, or your custom names).
        Matches the tiers guests see in checkout.
      </p>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {tiers.map((tier) => (
          <TierStatCard key={tier.level_id} tier={tier} configuredLevels={configured} />
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <TierHorizontalBarChart
          data={ticketsChart}
          title="Tickets sold by tier"
          valueFormatter={(v) => String(v)}
        />
        <TierHorizontalBarChart
          data={revenueChart}
          title="Revenue by tier"
          valueFormatter={(v) => formatCurrency(v)}
        />
      </div>
    </div>
  );
}
