import { useId, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Brush,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Sector,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { BarChart3 } from "lucide-react";
import { formatCurrency } from "../../utils/format";

const CHART_PALETTE = {
  rose: "#e11d48",
  roseLight: "#fb7185",
  slate: "#0f172a",
  violet: "#6366f1",
  emerald: "#10b981",
  grid: "#e2e8f0",
  muted: "#94a3b8"
};

const SOURCE_COLORS = ["#e11d48", "#0f172a", "#f59e0b", "#10b981", "#6366f1", "#ec4899", "#14b8a6", "#64748b"];
const DEVICE_COLORS = ["#0f172a", "#e11d48", "#6366f1", "#94a3b8"];

const axisTick = { fontSize: 11, fill: "#64748b", fontWeight: 500 };
const axisTickSmall = { fontSize: 10, fill: "#64748b" };

function formatCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return "0";
  }
  return n.toLocaleString("en-US");
}

export function InsightsChartTooltip({ active, payload, label, valueFormatter }) {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <div className="rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-2.5 shadow-lg shadow-slate-900/10 ring-1 ring-slate-900/5 backdrop-blur-md">
      {label ? <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p> : null}
      <ul className="space-y-1">
        {payload.map((entry) => (
          <li key={String(entry.dataKey)} className="flex items-center justify-between gap-4 text-sm">
            <span className="flex items-center gap-2 font-medium text-slate-700">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color || entry.payload?.fill || CHART_PALETTE.rose }}
              />
              {entry.name}
            </span>
            <span className="font-bold tabular-nums text-slate-900">
              {valueFormatter ? valueFormatter(entry.value, entry.name, entry) : formatCount(entry.value)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function ChartEmptyState({ message = "No data yet for this period." }) {
  return (
    <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-gradient-to-b from-slate-50 to-white px-6 text-center">
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <BarChart3 className="h-5 w-5" />
      </div>
      <p className="max-w-xs text-sm font-medium text-slate-600">{message}</p>
    </div>
  );
}

function ChartFrame({ children, height = 280, className = "" }) {
  return (
    <div
      className={`rounded-xl bg-gradient-to-b from-slate-50/80 to-white p-2 ring-1 ring-slate-100 ${className}`}
      style={{ height }}
    >
      {children}
    </div>
  );
}

export function ViewsOverTimeChart({ data, emptyMessage }) {
  const gradId = useId().replace(/:/g, "");
  if (!data?.length) {
    return <ChartEmptyState message={emptyMessage} />;
  }
  return (
    <ChartFrame height={300}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: data.length > 14 ? 28 : 0 }}>
          <defs>
            <linearGradient id={`viewsGrad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_PALETTE.rose} stopOpacity={0.45} />
              <stop offset="100%" stopColor={CHART_PALETTE.rose} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_PALETTE.grid} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={{ stroke: CHART_PALETTE.grid }} interval="preserveStartEnd" />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={36} />
          <Tooltip
            content={<InsightsChartTooltip />}
            cursor={{ stroke: CHART_PALETTE.roseLight, strokeWidth: 1, strokeDasharray: "4 4" }}
          />
          <Area
            type="monotone"
            dataKey="views"
            name="Page views"
            stroke={CHART_PALETTE.rose}
            strokeWidth={2.5}
            fill={`url(#viewsGrad-${gradId})`}
            activeDot={{ r: 6, stroke: "#fff", strokeWidth: 2, fill: CHART_PALETTE.rose }}
            animationDuration={800}
          />
          {data.length > 10 ? (
            <Brush
              dataKey="day"
              height={22}
              stroke={CHART_PALETTE.rose}
              fill="#fff7f8"
              travellerWidth={8}
              tickFormatter={(v) => String(v).slice(0, 6)}
            />
          ) : null}
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function HourlyViewsChart({
  data,
  highlightCurrentHour = true,
  currentHour: currentHourProp,
  timezoneLabel = "",
  isLiveDay = false
}) {
  const currentHour =
    Number.isFinite(Number(currentHourProp)) && currentHourProp >= 0 && currentHourProp <= 23
      ? Number(currentHourProp)
      : null;
  if (!data?.length) {
    return <ChartEmptyState message="No hourly data for this day yet." />;
  }
  return (
    <ChartFrame height={280}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
          <CartesianGrid stroke={CHART_PALETTE.grid} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="hour" tick={axisTickSmall} tickLine={false} axisLine={{ stroke: CHART_PALETTE.grid }} interval={2} />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
          <Tooltip
            content={({ active, payload, label }) => {
              const row = payload?.[0]?.payload;
              let hint = timezoneLabel ? ` (${timezoneLabel})` : "";
              if (row?.isFuture) {
                hint += " · upcoming hour";
              } else if (row?.liveRealtime) {
                hint += " · includes Realtime";
              } else if (!isLiveDay) {
                hint += " · standard report";
              }
              return (
                <InsightsChartTooltip active={active} payload={payload} label={`${label}${hint}`} />
              );
            }}
            cursor={{ fill: "rgba(225, 29, 72, 0.06)" }}
          />
          <Bar
            dataKey="views"
            name="Page views"
            radius={[6, 6, 0, 0]}
            animationDuration={700}
            maxBarSize={28}
            minPointSize={2}
          >
            {data.map((entry) => {
              const hourNum =
                Number.isFinite(entry.hourNum) ? entry.hourNum : parseInt(String(entry.hour).split(":")[0], 10);
              const isNow =
                (entry.isCurrentHour ||
                  (highlightCurrentHour && currentHour != null && hourNum === currentHour)) &&
                !entry.isFuture;
              let fill = CHART_PALETTE.slate;
              if (entry.isFuture) {
                fill = "#e2e8f0";
              } else if (isNow) {
                fill = CHART_PALETTE.rose;
              } else if (entry.liveRealtime) {
                fill = CHART_PALETTE.roseLight;
              }
              return (
                <Cell
                  key={`${entry.hour}-${hourNum}`}
                  fill={fill}
                  fillOpacity={entry.isFuture ? 0.45 : 1}
                  className="transition-opacity"
                />
              );
            })}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      {isLiveDay ? (
        <p className="mt-2 text-center text-[11px] font-medium text-slate-500">
          Highlighted bar = current hour. Light gray = later today.
        </p>
      ) : null}
    </ChartFrame>
  );
}

export function HorizontalBarChart({ data, valueFormatter, emptyMessage, valueLabel = "Views" }) {
  const [activeIndex, setActiveIndex] = useState(null);
  if (!data?.length) {
    return <ChartEmptyState message={emptyMessage} />;
  }
  const fmt = valueFormatter || formatCount;
  return (
    <ChartFrame height={Math.max(220, data.length * 36 + 48)}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
          <CartesianGrid stroke={CHART_PALETTE.grid} strokeDasharray="4 4" horizontal={false} />
          <XAxis type="number" tick={axisTick} tickLine={false} axisLine={{ stroke: CHART_PALETTE.grid }} allowDecimals={false} />
          <YAxis
            type="category"
            dataKey="name"
            tick={axisTickSmall}
            tickLine={false}
            axisLine={false}
            width={108}
          />
          <Tooltip
            content={({ active, payload, label }) => (
              <InsightsChartTooltip active={active} payload={payload} label={label} valueFormatter={fmt} />
            )}
            cursor={{ fill: "rgba(15, 23, 42, 0.04)" }}
          />
          <Bar
            dataKey="views"
            name={valueLabel}
            radius={[0, 8, 8, 0]}
            animationDuration={700}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={SOURCE_COLORS[i % SOURCE_COLORS.length]}
                opacity={activeIndex === null || activeIndex === i ? 1 : 0.35}
                onMouseEnter={() => setActiveIndex(i)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function CityBarChart({ data, emptyMessage }) {
  const [activeIndex, setActiveIndex] = useState(null);
  if (!data?.length) {
    return <ChartEmptyState message={emptyMessage} />;
  }
  return (
    <ChartFrame height={280}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 12, right: 8, left: 0, bottom: 48 }}>
          <CartesianGrid stroke={CHART_PALETTE.grid} strokeDasharray="4 4" vertical={false} />
          <XAxis
            dataKey="name"
            tick={axisTickSmall}
            tickLine={false}
            axisLine={{ stroke: CHART_PALETTE.grid }}
            interval={0}
            angle={-28}
            textAnchor="end"
            height={56}
          />
          <YAxis tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
          <Tooltip content={<InsightsChartTooltip />} cursor={{ fill: "rgba(99, 102, 241, 0.08)" }} />
          <Bar
            dataKey="views"
            name="Views"
            radius={[8, 8, 0, 0]}
            animationDuration={700}
            onMouseLeave={() => setActiveIndex(null)}
          >
            {data.map((_, i) => (
              <Cell
                key={i}
                fill={activeIndex === null || activeIndex === i ? CHART_PALETTE.violet : "#c7d2fe"}
                onMouseEnter={() => setActiveIndex(i)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

export function BookingsRevenueChart({ data, emptyMessage }) {
  const gradBook = useId().replace(/:/g, "");
  const gradRev = useId().replace(/:/g, "");
  if (!data?.length) {
    return <ChartEmptyState message={emptyMessage} />;
  }
  return (
    <ChartFrame height={300}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 12, right: 12, left: 0, bottom: 8 }}>
          <defs>
            <linearGradient id={`book-${gradBook}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_PALETTE.slate} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_PALETTE.slate} stopOpacity={0.02} />
            </linearGradient>
            <linearGradient id={`rev-${gradRev}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART_PALETTE.rose} stopOpacity={0.35} />
              <stop offset="100%" stopColor={CHART_PALETTE.rose} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CHART_PALETTE.grid} strokeDasharray="4 4" vertical={false} />
          <XAxis dataKey="day" tick={axisTick} tickLine={false} axisLine={{ stroke: CHART_PALETTE.grid }} />
          <YAxis yAxisId="left" tick={axisTick} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={axisTick}
            tickLine={false}
            axisLine={false}
            width={52}
            tickFormatter={(v) => `$${Number(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : v}`}
          />
          <Tooltip
            content={({ active, payload, label }) => (
              <InsightsChartTooltip
                active={active}
                payload={payload}
                label={label}
                valueFormatter={(v, name) =>
                  String(name).toLowerCase().includes("revenue") ? formatCurrency(v) : formatCount(v)
                }
              />
            )}
            cursor={{ stroke: CHART_PALETTE.muted, strokeDasharray: "4 4" }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            formatter={(value) => <span className="text-xs font-semibold text-slate-600">{value}</span>}
          />
          <Area
            yAxisId="left"
            type="monotone"
            dataKey="bookings"
            name="Bookings"
            stroke={CHART_PALETTE.slate}
            fill={`url(#book-${gradBook})`}
            strokeWidth={2}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
          <Area
            yAxisId="right"
            type="monotone"
            dataKey="revenue"
            name="Revenue"
            stroke={CHART_PALETTE.rose}
            fill={`url(#rev-${gradRev})`}
            strokeWidth={2}
            activeDot={{ r: 5, strokeWidth: 2, stroke: "#fff" }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartFrame>
  );
}

function renderDonutActiveShape(props) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  );
}

export function DistributionDonutChart({
  data,
  emptyMessage,
  valueKey = "value",
  centerLabel = "total"
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = useMemo(
    () => data.reduce((s, d) => s + (Number(d[valueKey]) || 0), 0),
    [data, valueKey]
  );

  if (!data?.length) {
    return <ChartEmptyState message={emptyMessage} />;
  }

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-center">
      <div className="relative w-full max-w-[280px]">
        <ChartFrame height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey={valueKey}
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={3}
                animationDuration={700}
                activeIndex={activeIndex}
                activeShape={renderDonutActiveShape}
                onMouseEnter={(_, index) => setActiveIndex(index)}
              >
                {data.map((entry, i) => (
                  <Cell
                    key={entry.name}
                    fill={entry.fill || SOURCE_COLORS[i % SOURCE_COLORS.length]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip
                content={
                  <InsightsChartTooltip
                    valueFormatter={(v) => formatCount(v)}
                  />
                }
              />
            </PieChart>
          </ResponsiveContainer>
        </ChartFrame>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-slate-900">{formatCount(total)}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{centerLabel}</p>
          </div>
        </div>
      </div>
      <ul className="grid w-full max-w-xs gap-2 sm:w-auto">
        {data.map((row, i) => (
          <li key={row.name}>
            <button
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onFocus={() => setActiveIndex(i)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                activeIndex === i
                  ? "border-slate-300 bg-white shadow-sm ring-2 ring-rose-500/20"
                  : "border-slate-100 bg-slate-50/80 hover:border-slate-200"
              }`}
            >
              <span className="flex items-center gap-2 font-medium text-slate-800">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{
                    backgroundColor: row.fill || SOURCE_COLORS[i % SOURCE_COLORS.length]
                  }}
                />
                {row.name}
              </span>
              <span className="font-bold tabular-nums text-slate-900">
                {formatCount(row[valueKey])}
                {total > 0 ? ` · ${Math.round((Number(row[valueKey]) / total) * 100)}%` : ""}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function DeviceDonutChart({ data, emptyMessage }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const total = useMemo(() => data.reduce((s, d) => s + (d.views || 0), 0), [data]);

  if (!data?.length) {
    return <ChartEmptyState message={emptyMessage} />;
  }

  return (
    <div className="flex flex-col items-center gap-6 lg:flex-row lg:items-center lg:justify-center">
      <div className="relative w-full max-w-[280px]">
        <ChartFrame height={260}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="views"
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={3}
                animationDuration={700}
                activeIndex={activeIndex}
                activeShape={renderDonutActiveShape}
                onMouseEnter={(_, index) => setActiveIndex(index)}
              >
                {data.map((_, i) => (
                  <Cell key={i} fill={DEVICE_COLORS[i % DEVICE_COLORS.length]} stroke="#fff" strokeWidth={2} />
                ))}
              </Pie>
              <Tooltip content={<InsightsChartTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </ChartFrame>
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <p className="text-2xl font-bold tabular-nums text-slate-900">{formatCount(total)}</p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">views</p>
          </div>
        </div>
      </div>
      <ul className="grid w-full max-w-xs gap-2 sm:w-auto">
        {data.map((row, i) => (
          <li key={row.name}>
            <button
              type="button"
              onMouseEnter={() => setActiveIndex(i)}
              onFocus={() => setActiveIndex(i)}
              className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                activeIndex === i
                  ? "border-slate-300 bg-white shadow-sm ring-2 ring-rose-500/20"
                  : "border-slate-100 bg-slate-50/80 hover:border-slate-200"
              }`}
            >
              <span className="flex items-center gap-2 font-medium text-slate-800">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: DEVICE_COLORS[i % DEVICE_COLORS.length] }}
                />
                {row.name}
              </span>
              <span className="font-bold tabular-nums text-slate-900">
                {total > 0 ? `${Math.round((row.views / total) * 100)}%` : "0%"}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TierHorizontalBarChart({ data, valueFormatter, title }) {
  const [activeIndex, setActiveIndex] = useState(null);
  if (!data?.length) {
    return null;
  }
  const fmt = valueFormatter || formatCount;
  const chartH = Math.max(200, data.length * 40 + 56);
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="text-sm font-bold text-slate-900">{title}</h4>
      <ChartFrame height={chartH - 32} className="mt-3 border-0 bg-transparent p-0 ring-0">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 12, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={CHART_PALETTE.grid} strokeDasharray="4 4" horizontal={false} />
          <XAxis type="number" tick={axisTickSmall} tickLine={false} axisLine={{ stroke: CHART_PALETTE.grid }} />
          <YAxis type="category" dataKey="name" width={92} tick={axisTickSmall} tickLine={false} axisLine={false} />
          <Tooltip
            content={({ active, payload, label }) => (
              <InsightsChartTooltip active={active} payload={payload} label={label} valueFormatter={fmt} />
            )}
          />
          <Bar dataKey="value" radius={[0, 8, 8, 0]} animationDuration={650} onMouseLeave={() => setActiveIndex(null)}>
            {data.map((entry, i) => (
              <Cell
                key={entry.name}
                fill={entry.fill}
                opacity={activeIndex === null || activeIndex === i ? 1 : 0.4}
                onMouseEnter={() => setActiveIndex(i)}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}

export function EngagementMetrics({
  eventClicks = 0,
  ticketClicks = 0,
  externalClicks = 0,
  tierCartAdds = 0,
  bookingsCompleted = 0,
  isPlatform
}) {
  const items = isPlatform
    ? [
        {
          key: "event",
          label: "Event listing clicks",
          value: eventClicks,
          color: "from-sky-500 to-sky-600"
        },
        {
          key: "tier",
          label: "Tickets added to cart",
          value: tierCartAdds,
          color: "from-rose-500 to-rose-600"
        },
        {
          key: "booking",
          label: "Bookings completed",
          value: bookingsCompleted,
          color: "from-violet-500 to-violet-600"
        },
        {
          key: "external",
          label: "Partner ticket link clicks",
          value: externalClicks,
          color: "from-slate-700 to-slate-900"
        }
      ]
    : [
        {
          key: "event",
          label: "Event listing clicks",
          value: eventClicks,
          color: "from-sky-500 to-sky-600"
        },
        {
          key: "ticket",
          label: "Ticket clicks",
          value: ticketClicks,
          color: "from-rose-500 to-rose-600"
        },
        {
          key: "external",
          label: "External clicks",
          value: externalClicks,
          color: "from-slate-700 to-slate-900"
        }
      ];
  const maxClicks = Math.max(...items.map((i) => i.value), 1);
  const itemsWithPct = items.map((item) => ({
    ...item,
    pct: (item.value / maxClicks) * 100
  }));

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {itemsWithPct.map((item, i) => (
          <motion.div
            key={item.key}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50/80 p-4 ring-1 ring-slate-100"
          >
            <div className="flex items-end justify-between gap-2">
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{item.label}</p>
              <p className="text-2xl font-bold tabular-nums text-slate-900">{formatCount(item.value)}</p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                initial={{ width: 0 }}
                animate={{ width: `${item.pct}%` }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
