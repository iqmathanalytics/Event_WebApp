const { BetaAnalyticsDataClient } = require("@google-analytics/data");
const {
  getGaReportingTimezone,
  getCalendarDateString,
  getCurrentHour,
  getTimezoneShortLabel,
  isValidCalendarDateString,
  listHourlyDateOptions
} = require("../utils/gaReportingTimezone");

const EVENT_PARAM = "bmt_event_id";
const ENGAGEMENT_EVENTS = [
  "bmt_event_click",
  "bmt_ticket_click",
  "bmt_external_click",
  "bmt_ticket_tier_add",
  "bmt_booking_complete"
];
const EVENT_DIM = `customEvent:${EVENT_PARAM}`;
const PAGE_VIEW_EVENT = "page_view";
/** Event-scoped custom dimensions must use eventCount, not screenPageViews. */
const VIEW_METRIC = "eventCount";

let client = null;

/**
 * GA Realtime screenPageViews is a rolling ~30m window, not calendar-hour totals.
 * Keep per-hour peaks for today so the current hour does not drop to zero when
 * Realtime expires before standard dateHour data lands.
 */
const hourlyViewsPeakByKey = new Map();

/** Cut duplicate Data API calls (insights polls every 45s; each load was 10+ requests). */
const reportCache = new Map();
const inFlightRequests = new Map();
const CACHE_TTL_MS = 55_000;
const REALTIME_CACHE_TTL_MS = 28_000;

function hourlyPeakKey(eventId, dateStr, hour) {
  return `${String(eventId)}|${dateStr}|${hour}`;
}

function pruneHourlyPeakCache() {
  const cutoff = Date.now() - 48 * 60 * 60 * 1000;
  for (const [key, entry] of hourlyViewsPeakByKey) {
    if (entry.updatedAt < cutoff) {
      hourlyViewsPeakByKey.delete(key);
    }
  }
}

function mergeHourlyPeak(eventId, dateStr, hour, views, { liveRealtime = false } = {}) {
  const key = hourlyPeakKey(eventId, dateStr, hour);
  const prev = hourlyViewsPeakByKey.get(key);
  const nextViews = Math.max(Number(views) || 0, prev?.views ?? 0);
  const nextLive =
    liveRealtime || Boolean(prev?.liveRealtime) || nextViews > (prev?.views ?? 0);
  hourlyViewsPeakByKey.set(key, {
    views: nextViews,
    liveRealtime: nextLive,
    updatedAt: Date.now()
  });
  if (hourlyViewsPeakByKey.size > 8000) {
    pruneHourlyPeakCache();
  }
  return { views: nextViews, live_realtime: nextLive };
}

function parseCredentials() {
  const raw = process.env.GA_SERVICE_ACCOUNT_JSON?.trim();
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw);
  } catch (_err) {
    return null;
  }
}

function getPropertyId() {
  const id = process.env.GA4_PROPERTY_ID?.trim();
  if (!id) {
    return null;
  }
  return id.replace(/^properties\//, "");
}

function isConfigured() {
  return Boolean(getPropertyId() && parseCredentials());
}

function getClient() {
  if (!isConfigured()) {
    return null;
  }
  if (!client) {
    client = new BetaAnalyticsDataClient({ credentials: parseCredentials() });
  }
  return client;
}

function eventIdFilter(eventId) {
  return {
    filter: {
      fieldName: EVENT_DIM,
      stringFilter: { matchType: "EXACT", value: String(eventId) }
    }
  };
}

/** page_view events tagged with bmt_event_id (matches frontend gtag). */
function eventPageViewFilter(eventId) {
  return {
    andGroup: {
      expressions: [
        eventIdFilter(eventId),
        {
          filter: {
            fieldName: "eventName",
            stringFilter: { matchType: "EXACT", value: PAGE_VIEW_EVENT }
          }
        }
      ]
    }
  };
}

/** Fallback when custom dimension bmt_event_id is not registered in GA4. */
function eventPagePathFilter(eventId) {
  const idStr = String(eventId);
  return {
    andGroup: {
      expressions: [
        {
          filter: {
            fieldName: "eventName",
            stringFilter: { matchType: "EXACT", value: PAGE_VIEW_EVENT }
          }
        },
        {
          filter: {
            fieldName: "pagePath",
            stringFilter: { matchType: "CONTAINS", value: `-${idStr}` }
          }
        }
      ]
    }
  };
}

function cacheGet(key) {
  const entry = reportCache.get(key);
  if (!entry) {
    return undefined;
  }
  if (Date.now() >= entry.expires) {
    reportCache.delete(key);
    return undefined;
  }
  return entry.value;
}

function cacheSet(key, value, ttlMs = CACHE_TTL_MS) {
  reportCache.set(key, { value, expires: Date.now() + ttlMs });
  if (reportCache.size > 500) {
    const now = Date.now();
    for (const [k, entry] of reportCache) {
      if (now >= entry.expires) {
        reportCache.delete(k);
      }
    }
  }
}

function cachedRequest(key, ttlMs, fn) {
  const hit = cacheGet(key);
  if (hit !== undefined) {
    return Promise.resolve(hit);
  }
  if (inFlightRequests.has(key)) {
    return inFlightRequests.get(key);
  }
  const promise = Promise.resolve()
    .then(fn)
    .then((value) => {
      cacheSet(key, value, ttlMs);
      inFlightRequests.delete(key);
      return value;
    })
    .catch((err) => {
      inFlightRequests.delete(key);
      throw err;
    });
  inFlightRequests.set(key, promise);
  return promise;
}

function logGaApiWarning(context, err) {
  const msg = String(err?.details || err?.message || err || "");
  if (msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Exhausted property tokens")) {
    console.warn(`[GA4] ${context}: API quota temporarily exceeded; live counts pause for up to an hour.`);
    return;
  }
  if (msg.includes("INVALID_ARGUMENT")) {
    console.warn(`[GA4] ${context}: invalid request —`, msg.trim() || "INVALID_ARGUMENT");
    return;
  }
  console.warn(`[GA4] ${context}:`, msg.trim() || err);
}

function parseMultiRangeMetricValues(response) {
  const row = response?.rows?.[0];
  if (!row?.metricValues?.length) {
    return [];
  }
  return row.metricValues.map((cell) => {
    const n = Number(cell?.value);
    return Number.isFinite(n) ? n : 0;
  });
}

function realtimePathMatchesEvent(pathValue, eventId) {
  const path = String(pathValue || "").toLowerCase();
  const idStr = String(eventId);
  if (!path.includes("/events")) {
    return false;
  }
  const needle = `-${idStr}`;
  return (
    path.includes(needle) ||
    path.endsWith(`/${idStr}`) ||
    path.endsWith(`/${idStr}/`) ||
    path.includes(`/events/${idStr}`)
  );
}

function parseMetricValue(row, index = 0) {
  const value = row?.metricValues?.[index]?.value;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function parseDimensionValue(row, index = 0) {
  return row?.dimensionValues?.[index]?.value || "";
}

async function runReport({ dimensions, metrics, dateRanges, dimensionFilter, limit, orderBys }) {
  const ga = getClient();
  const propertyId = getPropertyId();
  if (!ga || !propertyId) {
    return null;
  }

  const request = {
    property: `properties/${propertyId}`,
    dimensions: dimensions.map((name) => ({ name })),
    metrics: metrics.map((name) => ({ name })),
    dateRanges,
    returnPropertyQuota: false
  };

  if (dimensionFilter) {
    request.dimensionFilter = dimensionFilter;
  }
  if (limit) {
    request.limit = limit;
  }
  if (orderBys?.length) {
    request.orderBys = orderBys;
  }

  const cacheKey = `std:${JSON.stringify({ propertyId, dimensions, metrics, dateRanges, dimensionFilter, limit })}`;
  return cachedRequest(cacheKey, CACHE_TTL_MS, async () => {
    const [response] = await ga.runReport(request);
    return response;
  });
}

async function runRealtimeReport({ metrics, dimensions = [], dimensionFilter, limit }) {
  const ga = getClient();
  const propertyId = getPropertyId();
  if (!ga || !propertyId) {
    return null;
  }

  const request = {
    property: `properties/${propertyId}`,
    metrics: metrics.map((name) => ({ name }))
  };
  if (dimensions.length) {
    request.dimensions = dimensions.map((name) => ({ name }));
  }
  if (dimensionFilter) {
    request.dimensionFilter = dimensionFilter;
  }
  if (limit) {
    request.limit = limit;
  }

  const cacheKey = `rt:${JSON.stringify({ metrics, dimensions, limit })}`;
  const cached = cacheGet(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  try {
    const [response] = await ga.runRealtimeReport(request);
    cacheSet(cacheKey, response, REALTIME_CACHE_TTL_MS);
    return response;
  } catch (err) {
    logGaApiWarning("runRealtimeReport", err);
    return null;
  }
}

async function metricTotal(eventId, { startDate, endDate }, metricName = VIEW_METRIC, filter = null) {
  const primaryFilter = filter || eventPageViewFilter(eventId);
  const response = await runReport({
    dimensions: [],
    metrics: [metricName],
    dateRanges: [{ startDate, endDate }],
    dimensionFilter: primaryFilter
  });
  let total = response?.rows?.length ? parseMetricValue(response.rows[0], 0) : 0;
  if (total === 0 && metricName === VIEW_METRIC && !filter) {
    const pathResponse = await runReport({
      dimensions: [],
      metrics: [metricName],
      dateRanges: [{ startDate, endDate }],
      dimensionFilter: eventPagePathFilter(eventId)
    });
    total = pathResponse?.rows?.length ? parseMetricValue(pathResponse.rows[0], 0) : 0;
  }
  return total;
}

async function fetchEventPageViewTotals(eventId) {
  const cacheKey = `view-totals:${eventId}`;
  return cachedRequest(cacheKey, CACHE_TTL_MS, async () => {
    /** GA Data API allows at most 4 dateRanges per runReport request. */
    const primaryRanges = [
      reportingDateRange(0),
      reportingDateRange(-1),
      { startDate: "7daysAgo", endDate: "today" },
      { startDate: "30daysAgo", endDate: "today" }
    ];

    const loadPrimary = async (dimensionFilter) => {
      const response = await runReport({
        dimensions: [],
        metrics: [VIEW_METRIC],
        dateRanges: primaryRanges,
        dimensionFilter
      });
      const vals = parseMultiRangeMetricValues(response);
      return vals.length >= 4 ? vals : [0, 0, 0, 0];
    };

    let [viewsToday, viewsYesterday, views7, views30] = await loadPrimary(eventPageViewFilter(eventId));
    if (viewsToday + viewsYesterday + views7 + views30 === 0) {
      [viewsToday, viewsYesterday, views7, views30] = await loadPrimary(eventPagePathFilter(eventId));
    }

    const [todayDirect, yesterdayDirect] = await Promise.all([
      metricTotal(eventId, reportingDateRange(0)),
      metricTotal(eventId, reportingDateRange(-1))
    ]);
    viewsToday = Math.max(viewsToday, todayDirect);
    viewsYesterday = Math.max(viewsYesterday, yesterdayDirect);

    if (views7 === 0) {
      views7 = await metricTotal(eventId, { startDate: "7daysAgo", endDate: "today" });
    }
    if (views30 === 0) {
      views30 = await metricTotal(eventId, { startDate: "30daysAgo", endDate: "today" });
    }

    let viewsAll = await metricTotal(eventId, { startDate: "2020-01-01", endDate: "today" });

    const users30 = await metricTotal(
      eventId,
      { startDate: "30daysAgo", endDate: "today" },
      "activeUsers",
      eventPageViewFilter(eventId)
    );

    return { viewsToday, viewsYesterday, views7, views30, viewsAll, users30 };
  });
}

function normalizeScreenTitle(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

/** Match GA unifiedScreenName to event title (exact; allow minor GA title truncation). */
function screenTitleMatches(eventTitle, gaScreenName) {
  const a = normalizeScreenTitle(eventTitle);
  const b = normalizeScreenTitle(gaScreenName);
  if (!a || !b) {
    return false;
  }
  if (a === b) {
    return true;
  }
  if (a.length >= 10 && b.includes(a)) {
    return true;
  }
  if (b.length >= 10 && a.includes(b)) {
    return true;
  }
  const minLen = Math.min(a.length, b.length);
  if (minLen < 20) {
    return false;
  }
  return a.startsWith(b) || b.startsWith(a);
}

/**
 * Realtime API (last ~30 min) — only unifiedScreenName is supported (not pagePath/customEvent).
 * Match event title in screen name; frontend sets document.title on event pages.
 */
async function getRealtimeEventMetrics(eventId, eventTitle) {
  const title = String(eventTitle || "").trim();
  if (!title) {
    return { activeUsers: 0, screenPageViews: 0 };
  }

  const cacheKey = `rt-event:${eventId}:${normalizeScreenTitle(title)}`;
  return cachedRequest(cacheKey, REALTIME_CACHE_TTL_MS, async () => {
    const titleRt = await runRealtimeReport({
      dimensions: ["unifiedScreenName"],
      metrics: ["screenPageViews", "activeUsers"],
      limit: 100
    });

    let activeUsers = 0;
    let screenPageViews = 0;

    for (const row of titleRt?.rows || []) {
      const name = row.dimensionValues?.[0]?.value || "";
      if (!screenTitleMatches(title, name)) {
        continue;
      }
      screenPageViews = Math.max(screenPageViews, parseMetricValue(row, 0));
      activeUsers = Math.max(activeUsers, parseMetricValue(row, 1));
    }

    return { activeUsers, screenPageViews };
  });
}

/** @deprecated Use getRealtimeEventMetrics — kept for tests/scripts. */
async function getRealtimeScreenMetrics(eventTitle) {
  const title = String(eventTitle || "").trim();
  if (!title) {
    return { activeUsers: 0, screenPageViews: 0 };
  }
  const titleRt = await runRealtimeReport({
    dimensions: ["unifiedScreenName"],
    metrics: ["activeUsers", "screenPageViews"],
    limit: 100
  });
  let activeUsers = 0;
  let screenPageViews = 0;
  for (const row of titleRt?.rows || []) {
    const name = row.dimensionValues?.[0]?.value || "";
    if (!screenTitleMatches(title, name)) {
      continue;
    }
    activeUsers = Math.max(activeUsers, parseMetricValue(row, 0));
    screenPageViews = Math.max(screenPageViews, parseMetricValue(row, 1));
  }
  return { activeUsers, screenPageViews };
}

function reportingDateRange(dayOffset = 0) {
  const date = getCalendarDateString(dayOffset);
  return { startDate: date, endDate: date };
}

/** Property-wide realtime click counts (until per-event standard data exists). */
async function getRealtimeClickCountsProperty() {
  const rt = await runRealtimeReport({
    dimensions: ["eventName"],
    metrics: ["eventCount"],
    limit: 50
  });
  let ticketClicks = 0;
  let externalClicks = 0;
  for (const row of rt?.rows || []) {
    const name = parseDimensionValue(row, 0);
    const count = parseMetricValue(row, 0);
    if (name === "bmt_ticket_click") {
      ticketClicks = count;
    } else if (name === "bmt_external_click") {
      externalClicks = count;
    }
  }
  return {
    total_clicks: ticketClicks + externalClicks,
    ticket_clicks: ticketClicks,
    external_clicks: externalClicks,
    property_wide: true
  };
}

function reconcileStandardTotals(metrics) {
  const out = { ...metrics };
  if (out.views_last_30_days < out.views_last_7_days) {
    out.views_last_30_days = out.views_last_7_days;
  }
  if (out.total_views < out.views_last_7_days) {
    out.total_views = out.views_last_7_days;
  }
  if (out.total_views < out.views_today) {
    out.total_views = out.views_today;
  }
  return out;
}

function buildDataSources(standard, realtime) {
  const hasStandard =
    standard.views_today > 0 ||
    standard.views_last_7_days > 0 ||
    standard.total_views > 0;

  return {
    views_today: standard.views_today > 0 ? "standard" : "none",
    views_yesterday: standard.views_yesterday > 0 ? "standard" : "none",
    views_last_7_days: standard.views_last_7_days > 0 ? "standard" : "none",
    views_last_30_days: standard.views_last_30_days > 0 ? "standard" : "none",
    total_views: standard.total_views > 0 ? "standard" : "none",
    live_users: realtime.activeUsers > 0 ? "realtime" : "none",
    live_views: realtime.screenPageViews > 0 ? "realtime" : "none",
    standard_available: hasStandard
  };
}

/**
 * Standard reports (bmt_event_id) for historical KPIs; Realtime (page title) for live only.
 * Never mix today's page views with active users.
 */
async function getEventTrafficMetrics(eventId, { eventTitle, realtime: realtimeSnapshot } = {}) {
  const tz = getGaReportingTimezone();
  const todayDate = getCalendarDateString(0, tz);
  const yesterdayDate = getCalendarDateString(-1, tz);

  const [totals, realtime] = await Promise.all([
    fetchEventPageViewTotals(eventId),
    realtimeSnapshot
      ? Promise.resolve(realtimeSnapshot)
      : getRealtimeEventMetrics(eventId, eventTitle)
  ]);

  const {
    viewsToday,
    viewsYesterday,
    views7,
    views30,
    viewsAll,
    users30
  } = totals;

  const liveViewsToday = Number(realtime.screenPageViews) || 0;
  const standard = reconcileStandardTotals({
    total_views: viewsAll,
    views_today: Math.max(viewsToday, liveViewsToday),
    views_today_standard: viewsToday,
    views_today_live: liveViewsToday,
    views_yesterday: viewsYesterday,
    views_last_7_days: views7,
    views_last_30_days: views30,
    active_users_30d: users30,
    reporting_timezone: tz,
    reporting_timezone_label: getTimezoneShortLabel(tz),
    today_date: todayDate,
    yesterday_date: yesterdayDate
  });

  const dataSources = buildDataSources(standard, realtime);
  const standardEmpty = !dataSources.standard_available;

  const result = {
    ...standard,
    live_sessions_30m: realtime.activeUsers,
    live_views_30m: realtime.screenPageViews,
    realtime_proxy: standardEmpty,
    data_sources: dataSources
  };

  if (standardEmpty && (realtime.activeUsers > 0 || realtime.screenPageViews > 0)) {
    result.views_today = realtime.screenPageViews;
    result.data_sources = {
      ...dataSources,
      views_today: realtime.screenPageViews > 0 ? "realtime_30m" : "none",
      standard_available: false
    };
  }

  return result;
}

async function getEventViewsTimeSeries(eventId, days = 30) {
  const response = await runReport({
    dimensions: ["date"],
    metrics: [VIEW_METRIC],
    dateRanges: [{ startDate: `${days}daysAgo`, endDate: "today" }],
    dimensionFilter: eventPageViewFilter(eventId),
    orderBys: [{ dimension: { dimensionName: "date" } }]
  });

  if (!response?.rows?.length) {
    return [];
  }

  return response.rows.map((row) => {
    const raw = parseDimensionValue(row, 0);
    const y = raw.slice(0, 4);
    const m = raw.slice(4, 6);
    const d = raw.slice(6, 8);
    return {
      day: `${y}-${m}-${d}`,
      views: parseMetricValue(row, 0)
    };
  });
}

async function getEventHourlyForDate(eventId, dateStr) {
  const dayKey = String(dateStr || "").replace(/-/g, "");
  let response = await runReport({
    dimensions: ["dateHour"],
    metrics: [VIEW_METRIC],
    dateRanges: [{ startDate: dateStr, endDate: dateStr }],
    dimensionFilter: eventPageViewFilter(eventId),
    limit: 48
  });

  if (!response?.rows?.length) {
    response = await runReport({
      dimensions: ["dateHour"],
      metrics: [VIEW_METRIC],
      dateRanges: [{ startDate: dateStr, endDate: dateStr }],
      dimensionFilter: eventPagePathFilter(eventId),
      limit: 48
    });
  }

  if (!response?.rows?.length) {
    return [];
  }

  const byHour = new Map();
  for (const row of response.rows) {
    const dateHour = parseDimensionValue(row, 0);
    if (!dateHour.startsWith(dayKey)) {
      continue;
    }
    const hour = Number(dateHour.slice(-2));
    if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
      continue;
    }
    const views = parseMetricValue(row, 0);
    byHour.set(hour, (byHour.get(hour) || 0) + views);
  }

  return [...byHour.entries()]
    .map(([hour, views]) => ({ hour, views }))
    .sort((a, b) => a.hour - b.hour);
}

/**
 * Hourly page views for one calendar day.
 * Today: standard buckets + GA Realtime on the current hour (live, full-day tracking).
 * Past days: standard GA only.
 */
async function getEventHourlyChart(eventId, { eventTitle, dateStr: requestedDate, realtime: realtimeSnapshot } = {}) {
  const tz = getGaReportingTimezone();
  const todayDate = getCalendarDateString(0, tz);
  const targetDate =
    isValidCalendarDateString(requestedDate) && requestedDate <= todayDate
      ? requestedDate.trim()
      : todayDate;
  const isToday = targetDate === todayDate;
  const currentHour = isToday ? getCurrentHour(tz) : null;

  const fetches = [getEventHourlyForDate(eventId, targetDate)];
  if (isToday) {
    fetches.push(
      realtimeSnapshot
        ? Promise.resolve(realtimeSnapshot)
        : getRealtimeEventMetrics(eventId, eventTitle),
      metricTotal(eventId, { startDate: targetDate, endDate: targetDate })
    );
  }

  const results = await Promise.all(fetches);
  const standardRows = results[0];
  const realtime = isToday ? results[1] : { activeUsers: 0, screenPageViews: 0 };
  const dayTotalViews = isToday ? results[2] : 0;

  const hourlyToday = [];
  for (let hour = 0; hour < 24; hour += 1) {
    const match = standardRows.find((r) => Number(r.hour) === hour);
    let views = match ? match.views : 0;
    let live_realtime = false;
    const is_future = isToday && currentHour != null && hour > currentHour;
    const is_current_hour = isToday && currentHour != null && hour === currentHour;

    if (is_current_hour) {
      const rtViews = Number(realtime.screenPageViews) || 0;
      const rtUsers = Number(realtime.activeUsers) || 0;
      views = Math.max(views, rtViews);
      if (rtUsers > 0 && views < rtUsers) {
        views = rtUsers;
      }
      live_realtime = rtViews > 0 || rtUsers > 0;
      const peaked = mergeHourlyPeak(eventId, targetDate, hour, views, { liveRealtime: live_realtime });
      views = peaked.views;
      live_realtime = peaked.live_realtime;
    } else if (isToday && currentHour != null && hour < currentHour) {
      const peak = hourlyViewsPeakByKey.get(hourlyPeakKey(eventId, targetDate, hour));
      if (peak) {
        views = Math.max(views, peak.views);
        live_realtime = peak.liveRealtime;
      }
    }

    hourlyToday.push({
      hour,
      views,
      live_realtime,
      is_future,
      is_current_hour
    });
  }

  if (isToday && dayTotalViews > 0) {
    const sumSoFar = hourlyToday.reduce((s, row) => (row.is_future ? s : s + row.views), 0);
    if (sumSoFar < dayTotalViews && currentHour != null) {
      const gap = dayTotalViews - sumSoFar;
      const current = hourlyToday.find((r) => r.hour === currentHour);
      if (current) {
        current.views += gap;
        current.live_realtime = true;
      }
    }
  }

  if (isToday && currentHour != null) {
    for (const row of hourlyToday) {
      if (row.is_future) {
        continue;
      }
      const peaked = mergeHourlyPeak(eventId, targetDate, row.hour, row.views, {
        liveRealtime: row.live_realtime
      });
      row.views = peaked.views;
      row.live_realtime = peaked.live_realtime;
    }
  }

  const standardDayTotal =
    isToday && dayTotalViews > 0
      ? dayTotalViews
      : hourlyToday.reduce((s, row) => (row.is_future ? s : s + row.views), 0);
  const liveDayViews = isToday ? Number(realtime.screenPageViews) || 0 : 0;
  const hourlySum = hourlyToday.reduce((s, row) => (row.is_future ? s : s + row.views), 0);
  let dayTotal = isToday ? Math.max(standardDayTotal, hourlySum, liveDayViews) : hourlySum;
  if (isToday) {
    const dayPeak = mergeHourlyPeak(eventId, targetDate, "day", dayTotal, { liveRealtime: liveDayViews > 0 });
    dayTotal = dayPeak.views;
  }

  return {
    hourly_today: hourlyToday,
    hourly_chart: {
      selected_date: targetDate,
      is_today: isToday,
      mode: isToday ? "live" : "standard",
      timezone: tz,
      timezone_label: getTimezoneShortLabel(tz),
      today_date: todayDate,
      current_hour: currentHour,
      current_hour_realtime_views: isToday ? realtime.screenPageViews : 0,
      current_hour_active_users: isToday ? realtime.activeUsers : 0,
      day_total_standard: standardDayTotal,
      day_total_live: liveDayViews,
      day_total_views: dayTotal,
      available_dates: listHourlyDateOptions(7, tz)
    }
  };
}

async function getEventTrafficSources(eventId, limit = 12) {
  const response = await runReport({
    dimensions: ["sessionDefaultChannelGroup"],
    metrics: [VIEW_METRIC],
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensionFilter: eventPageViewFilter(eventId),
    limit,
    orderBys: [{ desc: true, metric: { metricName: VIEW_METRIC } }]
  });

  if (!response?.rows?.length) {
    return [];
  }

  return response.rows.map((row) => ({
    source: parseDimensionValue(row, 0) || "direct",
    views: parseMetricValue(row, 0)
  }));
}

async function getEventGeoBreakdown(eventId, limit = 250) {
  const cacheKey = `geo:${eventId}:${limit}`;
  return cachedRequest(cacheKey, CACHE_TTL_MS, async () => {
    const [mapResponse, cityResponse] = await Promise.all([
      runReport({
        dimensions: ["country", "region"],
        metrics: ["activeUsers"],
        dateRanges: [{ startDate: "2020-01-01", endDate: "today" }],
        dimensionFilter: eventPageViewFilter(eventId),
        limit,
        orderBys: [{ desc: true, metric: { metricName: "activeUsers" } }]
      }),
      runReport({
        dimensions: ["country", "region", "city"],
        metrics: [VIEW_METRIC],
        dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
        dimensionFilter: eventPageViewFilter(eventId),
        limit,
        orderBys: [{ desc: true, metric: { metricName: VIEW_METRIC } }]
      })
    ]);

    const countries = [];
    for (const row of mapResponse?.rows || []) {
      const country = parseDimensionValue(row, 0);
      const region = parseDimensionValue(row, 1);
      const users = parseMetricValue(row, 0);
      if (country && users > 0) {
        countries.push({ country, region, users, views: users });
      }
    }

    const cities = [];
    for (const row of cityResponse?.rows || []) {
      const country = parseDimensionValue(row, 0);
      const region = parseDimensionValue(row, 1);
      const city = parseDimensionValue(row, 2);
      const views = parseMetricValue(row, 0);
      if (city && city !== "(not set)") {
        cities.push({
          city: region ? `${city}, ${region}` : city,
          country,
          views
        });
      }
    }

    if (!countries.length) {
      const fallback = await runReport({
        dimensions: ["country", "region"],
        metrics: ["activeUsers"],
        dateRanges: [{ startDate: "2020-01-01", endDate: "today" }],
        dimensionFilter: eventPagePathFilter(eventId),
        limit,
        orderBys: [{ desc: true, metric: { metricName: "activeUsers" } }]
      });
      for (const row of fallback?.rows || []) {
        const country = parseDimensionValue(row, 0);
        const region = parseDimensionValue(row, 1);
        const users = parseMetricValue(row, 0);
        if (country && users > 0) {
          countries.push({ country, region, users, views: users });
        }
      }
    }

    return { countries, cities };
  });
}

async function getEventDeviceBreakdown(eventId) {
  const response = await runReport({
    dimensions: ["deviceCategory"],
    metrics: [VIEW_METRIC],
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensionFilter: eventPageViewFilter(eventId),
    orderBys: [{ desc: true, metric: { metricName: VIEW_METRIC } }]
  });

  if (!response?.rows?.length) {
    return [];
  }

  return response.rows.map((row) => ({
    device: parseDimensionValue(row, 0) || "unknown",
    views: parseMetricValue(row, 0)
  }));
}

async function getEventClickMetrics(eventId) {
  const response = await runReport({
    dimensions: ["eventName"],
    metrics: ["eventCount"],
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensionFilter: eventIdFilter(eventId)
  });

  let eventClicks = 0;
  let ticketClicks = 0;
  let externalClicks = 0;
  let tierCartAdds = 0;
  let bookingsCompleted = 0;

  for (const row of response?.rows || []) {
    const name = parseDimensionValue(row, 0);
    if (!ENGAGEMENT_EVENTS.includes(name)) {
      continue;
    }
    const count = parseMetricValue(row, 0);
    if (name === "bmt_event_click") {
      eventClicks = count;
    } else if (name === "bmt_ticket_click") {
      ticketClicks = count;
    } else if (name === "bmt_external_click") {
      externalClicks = count;
    } else if (name === "bmt_ticket_tier_add") {
      tierCartAdds = count;
    } else if (name === "bmt_booking_complete") {
      bookingsCompleted = count;
    }
  }

  return {
    total_clicks: eventClicks + ticketClicks + tierCartAdds + externalClicks + bookingsCompleted,
    event_clicks: eventClicks,
    ticket_clicks: ticketClicks,
    external_clicks: externalClicks,
    tier_cart_adds: tierCartAdds,
    bookings_completed: bookingsCompleted
  };
}

async function listOrganizerEventSummaries(eventIds) {
  if (!isConfigured() || !eventIds.length) {
    return {};
  }

  const listFilter = {
    andGroup: {
      expressions: [
        {
          filter: {
            fieldName: "eventName",
            stringFilter: { matchType: "EXACT", value: PAGE_VIEW_EVENT }
          }
        },
        {
          filter: {
            fieldName: EVENT_DIM,
            inListFilter: { values: eventIds.map(String) }
          }
        }
      ]
    }
  };

  const response = await runReport({
    dimensions: [EVENT_DIM],
    metrics: [VIEW_METRIC],
    dateRanges: [{ startDate: "30daysAgo", endDate: "today" }],
    dimensionFilter: listFilter,
    limit: eventIds.length
  });

  const todayRange = reportingDateRange(0);
  const todayResponse = await runReport({
    dimensions: [EVENT_DIM],
    metrics: [VIEW_METRIC],
    dateRanges: [todayRange],
    dimensionFilter: listFilter,
    limit: eventIds.length
  });

  const map = {};
  for (const id of eventIds) {
    map[id] = { total_page_views: 0, views_today: 0 };
  }

  for (const row of response?.rows || []) {
    const id = parseDimensionValue(row, 0);
    if (map[id]) {
      map[id].total_page_views = parseMetricValue(row, 0);
    }
  }

  for (const row of todayResponse?.rows || []) {
    const id = parseDimensionValue(row, 0);
    if (map[id]) {
      map[id].views_today = parseMetricValue(row, 0);
    }
  }

  return map;
}

/** Last N days page_view counts keyed by event id (for discovery card popularity). */
async function getEventPageViewsMap(eventIds, days = 30) {
  if (!isConfigured() || !eventIds.length) {
    return {};
  }

  const listFilter = {
    andGroup: {
      expressions: [
        {
          filter: {
            fieldName: "eventName",
            stringFilter: { matchType: "EXACT", value: PAGE_VIEW_EVENT }
          }
        },
        {
          filter: {
            fieldName: EVENT_DIM,
            inListFilter: { values: eventIds.map(String) }
          }
        }
      ]
    }
  };

  const response = await runReport({
    dimensions: [EVENT_DIM],
    metrics: [VIEW_METRIC],
    dateRanges: [{ startDate: `${Math.max(1, Number(days) || 30)}daysAgo`, endDate: "today" }],
    dimensionFilter: listFilter,
    limit: Math.min(eventIds.length, 200)
  });

  const map = {};
  for (const id of eventIds) {
    map[String(id)] = 0;
  }
  for (const row of response?.rows || []) {
    const id = parseDimensionValue(row, 0);
    if (Object.prototype.hasOwnProperty.call(map, id)) {
      map[id] = parseMetricValue(row, 0);
    }
  }
  return map;
}

async function getRealtimeEventTotal() {
  const rt = await runRealtimeReport({
    metrics: ["eventCount"],
    dimensions: ["eventName"],
    limit: 50
  });
  if (!rt?.rows?.length) {
    return 0;
  }
  return rt.rows.reduce((sum, row) => sum + parseMetricValue(row, 0), 0);
}

async function getStandardReportEventTotalToday() {
  const response = await runReport({
    dimensions: ["eventName"],
    metrics: [VIEW_METRIC],
    dateRanges: [reportingDateRange(0)],
    limit: 50
  });
  if (!response?.rows?.length) {
    return 0;
  }
  return response.rows.reduce((sum, row) => sum + parseMetricValue(row, 0), 0);
}

/**
 * DebugView / GA Debugger extension traffic appears in Realtime but not in runReport (Insights).
 */
async function getDebugTrafficHint() {
  if (!isConfigured()) {
    return null;
  }
  try {
    const [realtimeTotal, standardTotal] = await Promise.all([
      getRealtimeEventTotal(),
      getStandardReportEventTotalToday()
    ]);
    if (realtimeTotal > 0 && standardTotal === 0) {
      return (
        "Visitors are on your site now. Full charts and breakdowns usually fill in within a day or two after you start sharing your event link."
      );
    }
  } catch {
    return null;
  }
  return null;
}

function getSetupNote() {
  if (isConfigured()) {
    const tz = getGaReportingTimezone();
    const label = getTimezoneShortLabel(tz);
    return `Insights update automatically. Dates and times follow ${label || tz}.`;
  }
  return "Analytics is not fully set up yet. Contact your administrator if numbers stay empty after you share your event.";
}

/** Shown when the site has traffic but per-event GA filters return nothing. */
async function getCustomDimensionSetupHint(eventId) {
  if (!isConfigured()) {
    return null;
  }
  try {
    const [propertyToday, eventToday] = await Promise.all([
      runReport({
        dimensions: [],
        metrics: ["screenPageViews"],
        dateRanges: [reportingDateRange(0)]
      }),
      metricTotal(eventId, reportingDateRange(0))
    ]);
    const siteViews = propertyToday?.rows?.length ? parseMetricValue(propertyToday.rows[0], 0) : 0;
    if (siteViews > 0 && eventToday === 0) {
      const pathToday = await metricTotal(eventId, reportingDateRange(0), VIEW_METRIC, eventPagePathFilter(eventId));
      if (pathToday > 0) {
        return (
          "Page views are tracked by URL, but the bmt_event_id parameter may not be reaching GA yet. Rebuild the frontend after setting VITE_GA_MEASUREMENT_ID and open this event page once (not only with the GA Debugger extension)."
        );
      }
      return (
        "Your site is getting visits, but this event has no tagged page views yet. Share the public event link and open it in a normal browser window (GA Debugger / DebugView does not fill Insights)."
      );
    }
  } catch {
    return null;
  }
  return null;
}

module.exports = {
  EVENT_PARAM,
  isConfigured,
  getSetupNote,
  getDebugTrafficHint,
  getEventTrafficMetrics,
  getRealtimeEventMetrics,
  getRealtimeScreenMetrics,
  getRealtimeClickCountsProperty,
  getCustomDimensionSetupHint,
  getEventViewsTimeSeries,
  getEventHourlyChart,
  getGaReportingTimezone,
  getEventTrafficSources,
  getEventGeoBreakdown,
  getEventDeviceBreakdown,
  getEventClickMetrics,
  listOrganizerEventSummaries,
  getEventPageViewsMap
};
