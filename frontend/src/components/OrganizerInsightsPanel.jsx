import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Activity, MapPin, RefreshCw } from "lucide-react";
import AnalyticsGeoMap from "./AnalyticsGeoMap";
import {
  BookingsRevenueChart,
  CityBarChart,
  DeviceDonutChart,
  DistributionDonutChart,
  EngagementMetrics,
  HourlyViewsChart,
  HorizontalBarChart,
  ViewsOverTimeChart
} from "./insights/InsightsCharts";
import TicketTierInsightsSection from "./TicketTierInsightsSection";
import {
  fetchOrganizerEventInsights,
  fetchOrganizerInsightsSummary
} from "../services/organizerAnalyticsService";
import { normalizeEventTicketSalesMode } from "../utils/eventTicketSalesMode";
import { formatCurrency, formatDateUS } from "../utils/format";
import { applyStoredHourlyPeak, hourlyPeakKey } from "../utils/hourlyViewsPeakStorage";

function formatSourceLabel(source) {
  const s = String(source || "direct");
  if (s === "direct") return "Direct / unknown";
  if (s === "bookmytickets") return "Book My Tickets";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function KpiCard({ label, value, sub, accent = "slate" }) {
  const accents = {
    slate: "from-white to-slate-50 border-slate-200",
    rose: "from-rose-50/90 to-white border-rose-200/80",
    emerald: "from-emerald-50/90 to-white border-emerald-200/80",
    violet: "from-violet-50/90 to-white border-violet-200/80"
  };
  const text = {
    slate: "text-slate-900",
    rose: "text-rose-950",
    emerald: "text-emerald-950",
    violet: "text-violet-950"
  };
  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`rounded-2xl border bg-gradient-to-br p-4 shadow-sm ring-1 ring-black/[0.03] ${accents[accent] || accents.slate}`}
    >
      <p className={`text-[10px] font-bold uppercase tracking-[0.12em] opacity-60 ${text[accent] || text.slate}`}>
        {label}
      </p>
      <p className={`mt-1.5 text-2xl font-bold tabular-nums tracking-tight ${text[accent] || text.slate}`}>{value}</p>
      {sub ? <p className="mt-1 text-[11px] font-medium opacity-75">{sub}</p> : null}
    </motion.div>
  );
}

function SectionCard({ title, hint, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-soft ring-1 ring-slate-900/[0.03] sm:p-5">
      <div className="border-b border-slate-100 px-4 py-4 sm:px-0 sm:pt-0">
        <h3 className="text-base font-bold tracking-tight text-slate-900">{title}</h3>
        {hint ? <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{hint}</p> : null}
      </div>
      <div className="p-4 pt-4 sm:px-0 sm:pb-0">{children}</div>
    </div>
  );
}

export default function OrganizerInsightsPanel({
  events: eventsProp = [],
  refreshKey = 0,
  organizerBookings = [],
  fixedEventId = null,
  embedded = false,
  fetchEventInsightsFn = null
}) {
  const [events, setEvents] = useState(eventsProp);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [loadedEventId, setLoadedEventId] = useState("");
  const [query, setQuery] = useState("");
  const [insights, setInsights] = useState(null);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("traffic");
  const [hourlyDate, setHourlyDate] = useState(null);
  const hourlyDateRef = useRef(null);
  hourlyDateRef.current = hourlyDate;
  const insightsRequestIdRef = useRef(0);
  const prevBookingsCountRef = useRef(organizerBookings.length);

  const fetchInsights = fetchEventInsightsFn || fetchOrganizerEventInsights;
  const skipEventPicker = Boolean(fixedEventId) || embedded;
  const autoLoadInsights = Boolean(fixedEventId) || embedded;

  const loadSummary = useCallback(async () => {
    if (fixedEventId) {
      return;
    }
    setLoadingList(true);
    setError("");
    try {
      const res = await fetchOrganizerInsightsSummary();
      const list = res?.data?.events || [];
      setEvents(list);
    } catch (err) {
      setError(err?.response?.data?.message || "Could not load events for insights.");
    } finally {
      setLoadingList(false);
    }
  }, [fixedEventId]);

  const loadInsights = useCallback(
    async ({ silent = false, hourlyDate: hourlyDateOverride, eventId: eventIdOverride } = {}) => {
      const eventId = eventIdOverride || fixedEventId || loadedEventId || selectedEventId;
      if (!eventId) {
        setInsights(null);
        return;
      }

      let requestId = insightsRequestIdRef.current;
      if (!silent) {
        requestId += 1;
        insightsRequestIdRef.current = requestId;
        setLoadingInsights(true);
        setError("");
      }

      try {
        const dateParam = hourlyDateOverride ?? hourlyDateRef.current ?? undefined;
        const res = await fetchInsights(eventId, {
          hourlyDate: dateParam
        });
        if (requestId !== insightsRequestIdRef.current) {
          return;
        }
        setInsights(res?.data || null);
        const selected = res?.data?.traffic?.hourly_chart?.selected_date;
        if (selected) {
          setHourlyDate(hourlyDateOverride ?? selected);
        }
        if (!silent) {
          setError("");
        }
      } catch (err) {
        if (requestId !== insightsRequestIdRef.current) {
          return;
        }
        if (!silent) {
          setInsights(null);
          const isTimeout = err?.code === "ECONNABORTED";
          setError(
            isTimeout
              ? "Analytics is taking longer than usual. Please try Load analytics again."
              : err?.response?.data?.message || "Could not load analytics for this event."
          );
        }
      } finally {
        if (!silent && requestId === insightsRequestIdRef.current) {
          setLoadingInsights(false);
        }
      }
    },
    [fixedEventId, loadedEventId, selectedEventId, fetchInsights]
  );

  useEffect(() => {
    if (fixedEventId) {
      setSelectedEventId(String(fixedEventId));
      setLoadedEventId(String(fixedEventId));
      return;
    }
    if (!eventsProp.length) {
      void loadSummary();
    } else {
      setEvents(eventsProp);
    }
  }, [eventsProp, fixedEventId, loadSummary]);

  useEffect(() => {
    setHourlyDate(null);
    if (!autoLoadInsights) {
      setInsights(null);
      setLoadedEventId("");
    }
  }, [selectedEventId, autoLoadInsights]);

  useEffect(() => {
    if (!autoLoadInsights) {
      return;
    }
    void loadInsights();
  }, [autoLoadInsights, loadInsights]);

  useEffect(() => {
    if (refreshKey <= 0) {
      return;
    }
    void loadSummary();
    if (autoLoadInsights || (loadedEventId && loadedEventId === selectedEventId)) {
      void loadInsights();
    }
  }, [refreshKey, loadSummary, loadInsights, autoLoadInsights, loadedEventId, selectedEventId]);

  useEffect(() => {
    if (!loadedEventId || loadedEventId !== selectedEventId) {
      return;
    }
    if (prevBookingsCountRef.current === organizerBookings.length) {
      return;
    }
    prevBookingsCountRef.current = organizerBookings.length;
    void loadInsights({ silent: true, eventId: loadedEventId });
  }, [organizerBookings.length, loadedEventId, selectedEventId, loadInsights]);

  const filteredEvents = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return events;
    }
    return events.filter((e) => String(e.title || "").toLowerCase().includes(q));
  }, [events, query]);

  const traffic = insights?.traffic;
  const bookings = insights?.bookings;
  const eventMeta = insights?.event;
  const isPlatform = normalizeEventTicketSalesMode(eventMeta?.ticket_sales_mode) === "platform";

  const timeSeries = useMemo(() => {
    const rows = traffic?.time_series || [];
    return rows.map((row) => ({
      day: formatDateUS(row.day),
      views: row.views
    }));
  }, [traffic?.time_series]);

  const hourlyChartMeta = traffic?.hourly_chart || {};
  const hourlyData = useMemo(() => {
    const rows = traffic?.hourly_today || [];
    const dateKey = hourlyChartMeta.selected_date || hourlyChartMeta.today_date || "today";
    const peakPrefix = `${selectedEventId || "event"}|${dateKey}|`;
    const formatHour = (h) => {
      const n = Number(h);
      if (n === 0) return "12 AM";
      if (n < 12) return `${n} AM`;
      if (n === 12) return "12 PM";
      return `${n - 12} PM`;
    };
    return Array.from({ length: 24 }, (_, hour) => {
      const match = rows.find((r) => Number(r.hour) === hour);
      const peakKey = hourlyPeakKey(selectedEventId || "event", dateKey, hour);
      const rawViews = match ? Number(match.views) || 0 : 0;
      const views = applyStoredHourlyPeak(peakKey, rawViews);
      const isCurrentHour =
        Boolean(match?.is_current_hour) ||
        (Boolean(hourlyChartMeta.is_today) &&
          Number(hourlyChartMeta.current_hour) === hour);
      const hadLive = views > rawViews || Boolean(match?.live_realtime);
      return {
        hour: formatHour(hour),
        hourNum: hour,
        views,
        liveRealtime: hadLive || Boolean(match?.live_realtime),
        isFuture: Boolean(match?.is_future),
        isCurrentHour
      };
    });
  }, [traffic?.hourly_today, hourlyChartMeta, selectedEventId]);

  const hourlyDateOptions = hourlyChartMeta.available_dates || [];
  const hourlyIsLive = Boolean(hourlyChartMeta.is_today);

  useEffect(() => {
    if (!loadedEventId || loadedEventId !== selectedEventId || activeTab !== "traffic" || !hourlyIsLive) {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void loadInsights({ silent: true });
    }, 60000);
    return () => window.clearInterval(timer);
  }, [loadedEventId, selectedEventId, activeTab, hourlyIsLive, loadInsights]);

  useEffect(() => {
    if (!loadedEventId || loadedEventId !== selectedEventId || activeTab !== "bookings") {
      return undefined;
    }
    const timer = window.setInterval(() => {
      void loadInsights({ silent: true });
    }, 30000);
    return () => window.clearInterval(timer);
  }, [loadedEventId, selectedEventId, activeTab, loadInsights]);

  const hourlySectionTitle = hourlyChartMeta.is_today
    ? "Today by hour"
    : hourlyChartMeta.selected_date
      ? `${formatDateUS(hourlyChartMeta.selected_date)} by hour`
      : "Views by hour";

  const sourceData = useMemo(
    () =>
      (traffic?.sources || []).map((row) => ({
        name: formatSourceLabel(row.source),
        views: row.views
      })),
    [traffic?.sources]
  );

  const cityData = useMemo(
    () => (traffic?.cities || []).map((row) => ({ name: row.city, views: row.views })),
    [traffic?.cities]
  );

  const deviceData = useMemo(
    () =>
      (traffic?.devices || []).map((row) => ({
        name: row.device === "unknown" ? "Unknown" : row.device.charAt(0).toUpperCase() + row.device.slice(1),
        views: row.views
      })),
    [traffic?.devices]
  );

  const bookingTrend = useMemo(
    () =>
      (bookings?.trend || []).map((row) => ({
        day: formatDateUS(row.day),
        bookings: row.bookings,
        revenue: row.revenue
      })),
    [bookings?.trend]
  );

  const countryData = useMemo(
    () => (traffic?.countries || []).map((row) => ({ ...row })),
    [traffic?.countries]
  );

  const bookingsPerEventData = useMemo(() => {
    const grouped = (organizerBookings || []).reduce((acc, item) => {
      const key = item.event_title || `Event #${item.event_id}`;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    return Object.entries(grouped)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [organizerBookings]);

  const attendeeByTierData = useMemo(
    () =>
      (bookings?.tiers || []).map((tier, index) => ({
        name: tier.level_name || "Ticket",
        value: Number(tier.tickets_sold) || 0,
        fill: tier.color || undefined
      })),
    [bookings?.tiers]
  );

  const dbBookingsCompleted =
    (Number(bookings?.paid_bookings) || 0) + (Number(bookings?.free_bookings) || 0);
  const dbTierTickets = Number(bookings?.total_tier_tickets) || 0;
  const gaConfigured = insights?.ga_configured !== false;
  const realtimeProxy = Boolean(traffic?.realtime_proxy);
  const todayLiveViews = Number(traffic?.live_views_30m) || 0;

  const hasTicketTiers =
    isPlatform &&
    ((bookings?.configured_levels?.length ?? 0) > 0 ||
      (eventMeta?.ticket_levels?.length ?? 0) > 0 ||
      (bookings?.tiers?.length ?? 0) > 0);

  const tabs = isPlatform
    ? [
        { key: "traffic", label: "Traffic" },
        { key: "bookings", label: "Bookings & revenue" },
        ...(hasTicketTiers ? [{ key: "tiers", label: "Ticket tiers" }] : []),
        { key: "audience", label: "Audience" },
        { key: "geo", label: "Geography" }
      ]
    : [
        { key: "traffic", label: "Traffic" },
        { key: "audience", label: "Audience" },
        { key: "geo", label: "Geography" }
      ];

  const activeEventId = autoLoadInsights ? fixedEventId || selectedEventId : loadedEventId;
  const analyticsReady = Boolean(activeEventId && insights);
  const canLoadAnalytics = Boolean(selectedEventId) && !autoLoadInsights;
  const showLoadPrompt = canLoadAnalytics && loadedEventId !== selectedEventId && !loadingInsights;

  const handleLoadAnalytics = () => {
    if (!selectedEventId) {
      return;
    }
    const eventId = selectedEventId;
    setError("");
    setLoadedEventId(eventId);
    void loadInsights({ eventId });
  };

  const handleRefreshAnalytics = () => {
    void loadSummary();
    const eventId = autoLoadInsights ? fixedEventId || selectedEventId : loadedEventId;
    if (eventId) {
      void loadInsights({ eventId });
    }
  };

  return (
    <div className="space-y-5">
      {!embedded ? (
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-5 text-white shadow-soft sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/60">Insights</p>
              <h2 className="mt-1 text-xl font-bold sm:text-2xl">Event performance analytics</h2>
              <p className="mt-2 max-w-2xl text-sm text-white/75">
                See how people discover your event, when they visit, where they are from, and how tickets perform — all
                in one place.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefreshAnalytics}
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold ring-1 ring-white/20 hover:bg-white/15"
            >
              <RefreshCw className={`h-4 w-4 ${loadingInsights ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-slate-900">Sales &amp; analytics</h3>
          <button
            type="button"
            onClick={() => void loadInsights()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loadingInsights ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      )}

      {!skipEventPicker ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft sm:p-5">
          <label className="text-sm font-semibold text-slate-900">Select event</label>
          <p className="mt-1 text-xs text-slate-500">Choose an event, then load analytics when you are ready.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto]">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search your events…"
              className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
            />
            <select
              value={selectedEventId}
              onChange={(e) => {
                setSelectedEventId(e.target.value);
                setInsights(null);
                setLoadedEventId("");
                setError("");
              }}
              className="min-w-[200px] rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium"
            >
              <option value="">Choose event</option>
              {filteredEvents.map((ev) => (
                <option key={ev.id} value={ev.id}>
                  {ev.title} ({ev.status})
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleLoadAnalytics}
              disabled={!selectedEventId || loadingInsights}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loadingInsights && loadedEventId === selectedEventId ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : null}
              Load analytics
            </button>
            {showLoadPrompt ? (
              <p className="text-xs text-slate-500">Select an event and click Load analytics to view performance.</p>
            ) : null}
          </div>
          {loadingList ? <p className="mt-2 text-xs text-slate-500">Loading events…</p> : null}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
          {error}
        </div>
      ) : null}

      {!activeEventId ? (
        <p className="text-sm text-slate-500">
          {selectedEventId && !autoLoadInsights
            ? "Click Load analytics above to view performance for the selected event."
            : "Select an event to view analytics."}
        </p>
      ) : loadingInsights && !insights ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-2xl bg-slate-100" />
          ))}
        </div>
      ) : insights && analyticsReady ? (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white">
              {eventMeta?.title}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
              {isPlatform ? "On-site tickets" : "External tickets"}
            </span>
            {eventMeta?.city_name ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600">
                <MapPin className="h-3 w-3" />
                {eventMeta.city_name}
              </span>
            ) : null}
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <KpiCard
              label="Today"
              value={traffic?.views_today ?? 0}
              sub={
                todayLiveViews > 0
                  ? `Page views today (includes ${todayLiveViews} recent visit${todayLiveViews === 1 ? "" : "s"})`
                  : "Page views today"
              }
              accent="rose"
            />
            <KpiCard
              label="Yesterday"
              value={traffic?.views_yesterday ?? 0}
              sub={traffic?.yesterday_date ? `Page views on ${formatDateUS(traffic.yesterday_date)}` : "Page views yesterday"}
            />
            <KpiCard
              label="Last 7 days"
              value={traffic?.views_last_7_days ?? 0}
              sub="Page views this week"
              accent="violet"
            />
            <KpiCard
              label="Last 30 days"
              value={traffic?.views_last_30_days ?? 0}
              sub="Page views this month"
            />
            <KpiCard
              label="All-time views"
              value={traffic?.total_views ?? 0}
              sub="Total page views"
              accent="emerald"
            />
            <KpiCard
              label="Live now"
              value={traffic?.live_sessions_30m ?? 0}
              sub="People on your event page right now"
              accent="rose"
            />
          </div>

          <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                  activeTab === tab.key ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "traffic" ? (
            <div className="grid min-w-0 gap-5 lg:grid-cols-2">
              <SectionCard
                title="Views over time"
                hint="Daily page views for the last 30 days. Drag the slider under the chart to focus on a date range."
              >
                <ViewsOverTimeChart
                  data={timeSeries}
                  emptyMessage="No view data yet. Share your event link to start collecting insights."
                />
              </SectionCard>

              <SectionCard
                title={hourlySectionTitle}
                hint={
                  hourlyChartMeta.is_today
                    ? `Views by hour today${hourlyChartMeta.timezone_label ? ` (${hourlyChartMeta.timezone_label})` : ""}. The highlighted bar is the current hour and refreshes automatically.`
                    : `Views by hour on ${formatDateUS(hourlyChartMeta.selected_date)}${hourlyChartMeta.timezone_label ? ` (${hourlyChartMeta.timezone_label})` : ""}. Total: ${hourlyChartMeta.day_total_views ?? "—"} page views.`
                }
              >
                {hourlyDateOptions.length > 1 ? (
                  <div className="mb-4 flex flex-wrap gap-2">
                    {hourlyDateOptions.map((opt) => {
                      const active =
                        (hourlyDate || hourlyChartMeta.selected_date) === opt.date;
                      return (
                        <button
                          key={opt.date}
                          type="button"
                          onClick={() => {
                            setHourlyDate(opt.date);
                            void loadInsights({ hourlyDate: opt.date });
                          }}
                          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                            active
                              ? "bg-slate-900 text-white"
                              : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                          }`}
                        >
                          {opt.label}
                          {opt.live ? (
                            <span className="ml-1.5 inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 align-middle" />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}
                <HourlyViewsChart
                  data={hourlyData}
                  currentHour={hourlyChartMeta.current_hour}
                  timezoneLabel={hourlyChartMeta.timezone_label}
                  highlightCurrentHour={hourlyChartMeta.is_today}
                  isLiveDay={hourlyChartMeta.is_today}
                />
              </SectionCard>

              <SectionCard
                title="Engagement"
                hint={
                  isPlatform
                    ? "Listing clicks count when someone opens your event from a card (image, title, or View Details). Bookings and cart totals come from your live sales."
                    : realtimeProxy
                      ? "Click counts will appear shortly after more people visit your event."
                      : "Ticket and partner link clicks on your event page (last 30 days)."
                }
              >
                <EngagementMetrics
                  eventClicks={Number(traffic?.event_clicks) || 0}
                  ticketClicks={traffic?.ticket_clicks ?? 0}
                  externalClicks={traffic?.external_clicks ?? 0}
                  tierCartAdds={isPlatform ? dbTierTickets : (traffic?.tier_cart_adds ?? 0)}
                  bookingsCompleted={isPlatform ? dbBookingsCompleted : (traffic?.bookings_completed ?? 0)}
                  isPlatform={isPlatform}
                />
              </SectionCard>

              <SectionCard
                title="Traffic sources"
                hint={
                  realtimeProxy
                    ? "Where visitors found your event. This chart appears once enough traffic has been recorded."
                    : "Where visitors found your event — search, social, direct links, and more."
                }
              >
                <HorizontalBarChart
                  data={sourceData}
                  emptyMessage={
                    realtimeProxy
                      ? "Traffic sources will show up soon. Share your event link to get started."
                      : "No source data yet. Share your event link to see where visitors come from."
                  }
                />
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "bookings" && isPlatform ? (
            <div className="grid min-w-0 gap-5 lg:grid-cols-2">
              <div className="grid grid-cols-2 gap-3 lg:col-span-2 lg:grid-cols-4">
                <KpiCard label="Bookings" value={bookings?.total_bookings ?? 0} accent="emerald" />
                <KpiCard label="Attendees" value={bookings?.total_attendees ?? 0} />
                <KpiCard label="Revenue" value={formatCurrency(bookings?.gross_revenue ?? 0)} accent="violet" />
                <KpiCard
                  label="Tickets by tier"
                  value={bookings?.tiers?.length ?? bookings?.configured_levels?.length ?? 0}
                  sub={
                    bookings?.total_tier_tickets
                      ? `${bookings.total_tier_tickets} tier tickets sold`
                      : "Tier breakdown in Ticket tiers tab"
                  }
                  accent="violet"
                />
              </div>

              <SectionCard title="Bookings & revenue trend" hint="Daily bookings and revenue for the last 30 days. Hover the chart for details.">
                <BookingsRevenueChart data={bookingTrend} emptyMessage="No bookings yet for this event." />
              </SectionCard>

              <SectionCard title="Payment breakdown" hint="How checkout attempts finished — paid, free, pending, or failed.">
                <ul className="space-y-2 text-sm">
                  <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span>Paid</span>
                    <span className="font-semibold">{bookings?.paid_bookings ?? 0}</span>
                  </li>
                  <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span>Free / $0</span>
                    <span className="font-semibold">{bookings?.free_bookings ?? 0}</span>
                  </li>
                  <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span>Pending</span>
                    <span className="font-semibold">{bookings?.pending_bookings ?? 0}</span>
                  </li>
                  <li className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                    <span>Failed</span>
                    <span className="font-semibold">{bookings?.failed_bookings ?? 0}</span>
                  </li>
                  <li className="flex justify-between border-t border-slate-200 pt-2 font-semibold">
                    <span>Coupon discounts</span>
                    <span>{formatCurrency(bookings?.total_discounts ?? 0)}</span>
                  </li>
                </ul>
              </SectionCard>

              <SectionCard
                title="Bookings per event"
                hint="Completed bookings across all of your events."
              >
                <HorizontalBarChart
                  data={bookingsPerEventData.map((row) => ({
                    name: row.name,
                    views: row.value
                  }))}
                  valueLabel="Bookings"
                  emptyMessage="No bookings yet. Sales will appear here as guests check out."
                />
              </SectionCard>

              <SectionCard
                title="Attendee distribution"
                hint="How attendees are split across ticket tiers for this event."
              >
                <DistributionDonutChart
                  data={attendeeByTierData}
                  centerLabel="attendees"
                  emptyMessage="No tier sales yet for this event."
                />
              </SectionCard>
            </div>
          ) : null}

          {activeTab === "tiers" && isPlatform ? (
            <SectionCard
              title="Ticket tier performance"
              hint="Tickets sold and revenue for each price level you set up for this event."
            >
              <TicketTierInsightsSection
                bookings={bookings}
                eventLevels={eventMeta?.ticket_levels || []}
              />
            </SectionCard>
          ) : null}

          {activeTab === "audience" ? (
            <div className="grid min-w-0 gap-5 lg:grid-cols-2">
              <SectionCard title="Visitor cities" hint="Top cities your visitors are in (last 30 days).">
                <CityBarChart
                  data={cityData}
                  emptyMessage="No city data yet. Traffic will appear after visitors view your event page."
                />
              </SectionCard>

              <SectionCard title="Devices" hint="Whether visitors use phones, computers, or tablets.">
                <DeviceDonutChart data={deviceData} emptyMessage="No device data yet." />
              </SectionCard>

              <div className="lg:col-span-2">
              <SectionCard
                title="Live right now"
                hint="People viewing your event page in the last 30 minutes."
              >
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center gap-5 rounded-2xl border border-emerald-200/80 bg-gradient-to-br from-emerald-50 via-white to-teal-50/50 p-6 shadow-sm ring-1 ring-emerald-100"
                >
                  <div className="relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white shadow-md ring-1 ring-emerald-100">
                    <span className="absolute inline-flex h-10 w-10 animate-ping rounded-full bg-emerald-400/40" />
                    <Activity className="relative h-8 w-8 text-emerald-600" />
                  </div>
                  <div>
                    <p className="text-4xl font-bold tabular-nums tracking-tight text-emerald-950">
                      {traffic?.live_sessions_30m ?? 0}
                    </p>
                    <p className="text-sm font-semibold text-emerald-800">active users</p>
                    <p className="mt-1.5 max-w-md text-xs leading-relaxed text-emerald-800/75">
                      {traffic?.live_views_30m > 0
                        ? `${traffic.live_views_30m} page view${traffic.live_views_30m === 1 ? "" : "s"} in the last 30 minutes`
                        : "Updates automatically while visitors browse your event"}
                    </p>
                  </div>
                </motion.div>
              </SectionCard>
              </div>
            </div>
          ) : null}

          {activeTab === "geo" ? (
            <SectionCard
              title="Visitor geography"
              hint="All-time unique visitors by location. Hover the map for state or country counts."
            >
              <AnalyticsGeoMap countries={countryData} />
            </SectionCard>
          ) : null}

          {!gaConfigured ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              {insights.analytics_note}
            </div>
          ) : (
            <p className="text-xs text-slate-500">{insights.analytics_note}</p>
          )}
        </motion.div>
      ) : null}
    </div>
  );
}
