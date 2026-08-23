import { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Users } from "lucide-react";
import { fetchOrganizerCheckInInsights } from "../services/organizerAnalyticsService";
import {
  ChartEmptyState,
  DistributionDonutChart,
  TierHorizontalBarChart
} from "./insights/InsightsCharts";
import { formatDateUS } from "../utils/format";

function KpiCard({ label, value, sub, accent = "slate", icon: Icon }) {
  const accents = {
    slate: "from-white to-slate-50 border-slate-200",
    rose: "from-rose-50/90 to-white border-rose-200/80",
    emerald: "from-emerald-50/90 to-white border-emerald-200/80",
    amber: "from-amber-50/90 to-white border-amber-200/80",
    violet: "from-violet-50/90 to-white border-violet-200/80"
  };
  const text = {
    slate: "text-slate-900",
    rose: "text-rose-950",
    emerald: "text-emerald-950",
    amber: "text-amber-950",
    violet: "text-violet-950"
  };
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm ring-1 ring-black/[0.03] ${accents[accent] || accents.slate}`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className={`text-[10px] font-bold uppercase tracking-[0.12em] opacity-60 ${text[accent] || text.slate}`}>
          {label}
        </p>
        {Icon ? <Icon className={`h-4 w-4 opacity-50 ${text[accent] || text.slate}`} aria-hidden /> : null}
      </div>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums tracking-tight ${text[accent] || text.slate}`}>
        {value}
      </p>
      {sub ? <p className="mt-1 text-[11px] font-medium opacity-75">{sub}</p> : null}
    </motion.div>
  );
}

function SectionCard({ title, hint, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-soft ring-1 ring-slate-900/[0.03]">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-5">
        <h3 className="text-base font-bold tracking-tight text-slate-900">{title}</h3>
        {hint ? <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{hint}</p> : null}
      </div>
      <div className="p-4 sm:p-5">{children}</div>
    </div>
  );
}

function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "0";
  }
  return n.toLocaleString("en-US");
}

export default function OrganizerCheckInPanel({ events = [] }) {
  const [selectedEventId, setSelectedEventId] = useState("");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const eventOptions = useMemo(
    () =>
      (events || [])
        .map((ev) => ({
          id: String(ev.id),
          title: ev.title || `Event #${ev.id}`,
          date: ev.event_date
        }))
        .sort((a, b) => String(b.date || "").localeCompare(String(a.date || ""))),
    [events]
  );

  useEffect(() => {
    if (!eventOptions.length) {
      setSelectedEventId("");
      return;
    }
    if (!selectedEventId || !eventOptions.some((e) => e.id === selectedEventId)) {
      setSelectedEventId(eventOptions[0].id);
    }
  }, [eventOptions, selectedEventId]);

  const loadInsights = useCallback(async (eventId) => {
    if (!eventId) {
      setData(null);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetchOrganizerCheckInInsights(eventId);
      setData(res?.data || null);
    } catch (err) {
      setData(null);
      setError(err?.response?.data?.message || "Could not load check-in analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setData(null);
      return;
    }
    void loadInsights(selectedEventId);
  }, [selectedEventId, loadInsights]);

  const totals = data?.totals || null;
  const categories = data?.by_category || [];
  const statusDonut = data?.status_breakdown || [];

  const categoryCheckedInChart = useMemo(
    () =>
      categories
        .filter((c) => Number(c.checked_in) > 0)
        .map((c) => ({
          name: c.level_name,
          value: c.checked_in,
          fill: c.color || "#10b981"
        })),
    [categories]
  );

  const categoryTotalChart = useMemo(
    () =>
      categories
        .filter((c) => Number(c.total_persons) > 0)
        .map((c) => ({
          name: c.level_name,
          value: c.total_persons,
          fill: c.color || "#6366f1"
        })),
    [categories]
  );

  return (
    <div className="space-y-4">
      <SectionCard
        title="Check-in analytics"
        hint="Track door entry by event. Totals use confirmed ticket holders."
      >
        <label className="block text-sm font-semibold text-slate-800" htmlFor="check-in-event-select">
          Event
        </label>
        <select
          id="check-in-event-select"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-100"
        >
          {!eventOptions.length ? <option value="">No events yet</option> : null}
          {eventOptions.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {ev.title}
              {ev.date ? ` · ${formatDateUS(ev.date)}` : ""}
            </option>
          ))}
        </select>
      </SectionCard>

      {error ? (
        <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p>
      ) : null}

      {loading ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-600">
          Loading check-in analytics…
        </p>
      ) : null}

      {!loading && selectedEventId && totals ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Total persons"
              value={formatCount(totals.total_persons)}
              sub={`${formatCount(totals.total_bookings)} confirmed bookings`}
              accent="slate"
              icon={Users}
            />
            <KpiCard
              label="Checked in"
              value={formatCount(totals.checked_in)}
              sub={`${formatCount(totals.checked_in_bookings)} bookings scanned`}
              accent="emerald"
              icon={CheckCircle2}
            />
            <KpiCard
              label="Not checked in"
              value={formatCount(totals.remaining)}
              sub="Still expected at the door"
              accent="amber"
            />
            <KpiCard
              label="Check-in rate"
              value={`${formatCount(totals.check_in_rate_pct)}%`}
              sub="Of confirmed ticket holders"
              accent="violet"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <SectionCard title="Entry status" hint="Checked in vs still outstanding.">
              {statusDonut.length ? (
                <DistributionDonutChart data={statusDonut} centerLabel="persons" />
              ) : (
                <ChartEmptyState message="No confirmed bookings for this event yet." />
              )}
            </SectionCard>

            <SectionCard
              title="Checked in by ticket category"
              hint="Persons checked in for each ticket type."
            >
              {categoryCheckedInChart.length ? (
                <TierHorizontalBarChart data={categoryCheckedInChart} title="Checked in" />
              ) : (
                <ChartEmptyState message="No check-ins yet for this event." />
              )}
            </SectionCard>
          </div>

          <SectionCard
            title="Ticket category breakdown"
            hint="Confirmed ticket holders per category, with check-in progress."
          >
            {categoryTotalChart.length || categories.length ? (
              <div className="space-y-4">
                {categoryTotalChart.length ? (
                  <TierHorizontalBarChart data={categoryTotalChart} title="Total persons by category" />
                ) : null}
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-3 py-2.5 font-semibold">Category</th>
                        <th className="px-3 py-2.5 font-semibold">Total</th>
                        <th className="px-3 py-2.5 font-semibold">Checked in</th>
                        <th className="px-3 py-2.5 font-semibold">Remaining</th>
                        <th className="px-3 py-2.5 font-semibold">Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categories.map((c) => (
                        <tr key={c.level_id} className="border-t border-slate-100">
                          <td className="px-3 py-2.5">
                            <span className="inline-flex items-center gap-2 font-semibold text-slate-900">
                              <span
                                className="h-2.5 w-2.5 rounded-full"
                                style={{ backgroundColor: c.color || "#64748b" }}
                              />
                              {c.level_name}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-800">
                            {formatCount(c.total_persons)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums font-semibold text-emerald-700">
                            {formatCount(c.checked_in)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-amber-800">
                            {formatCount(c.remaining)}
                          </td>
                          <td className="px-3 py-2.5 tabular-nums text-slate-800">
                            {formatCount(c.check_in_rate_pct)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <ChartEmptyState message="No ticket categories to show yet." />
            )}
          </SectionCard>
        </>
      ) : null}

      {!loading && !error && !eventOptions.length ? (
        <ChartEmptyState message="Create an event with platform tickets to see check-in analytics." />
      ) : null}
    </div>
  );
}
