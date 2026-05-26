const ApiError = require("../utils/ApiError");
const { resolveListingIdFromParam } = require("../utils/listingSlug");
const { findEventById, getEventClickCount, listEventsByOrganizer } = require("../models/eventModel");
const { countReservedSeatsForEvent } = require("../models/bookingModel");
const { pool } = require("../config/db");
const { attachEventSeatAvailability, parseTotalSeats } = require("../utils/eventSeats");
const googleAnalytics = require("./googleAnalyticsService");
const { parseTicketLevelsFromEvent } = require("../utils/eventTicketLevels");
const {
  resolveTicketTierKey,
  chartColorForTierKey,
  parseTicketItemsJson
} = require("../utils/ticketTierInsights");

async function assertOrganizerOwnsEvent(eventId, organizerId) {
  const event = await findEventById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  if (Number(event.organizer_id) !== Number(organizerId)) {
    throw new ApiError(403, "You can only view analytics for your own events");
  }
  return event;
}

function buildTierInsightsFromBookings(event, bookingRows) {
  const configuredLevels = parseTicketLevelsFromEvent(event);
  const levelById = new Map(configuredLevels.map((l) => [String(l.id), l]));
  const accum = new Map();

  const ensureTier = (levelId, levelName, unitPrice, indexHint) => {
    const id = String(levelId || "unknown");
    if (!accum.has(id)) {
      const level =
        levelById.get(id) ||
        configuredLevels.find((l) => String(l.id) === id) || {
          id,
          name: levelName || "Ticket",
          price: Number(unitPrice) || 0,
          sort_order: indexHint
        };
      const tierKey = resolveTicketTierKey(level, configuredLevels.indexOf(level), configuredLevels);
      accum.set(id, {
        level_id: id,
        level_name: level.name || levelName || "Ticket",
        tier_key: tierKey,
        color: chartColorForTierKey(tierKey),
        unit_price: Number(level.price ?? unitPrice) || 0,
        tickets_sold: 0,
        gross_revenue: 0,
        booking_count: 0
      });
    }
    return accum.get(id);
  };

  for (const row of bookingRows) {
    const days = Math.max(1, Number(row.total_days) || 1);
    let items = parseTicketItemsJson(row.ticket_items_json);
    if (!items.length && configuredLevels.length) {
      const primary = configuredLevels[0];
      const qty = Math.max(1, Number(row.attendee_count) || 1);
      items = [
        {
          level_id: primary.id,
          level_name: primary.name,
          unit_price: primary.price,
          quantity: qty
        }
      ];
    } else if (!items.length) {
      const qty = Math.max(1, Number(row.attendee_count) || 1);
      items = [{ level_id: "legacy", level_name: "General Admission", unit_price: 0, quantity: qty }];
    }

    const touched = new Set();
    for (const item of items) {
      const levelId = String(item.level_id || item.levelId || "").trim();
      const qty = Number(item.quantity) || 0;
      if (!levelId || qty <= 0) {
        continue;
      }
      const tier = ensureTier(levelId, item.level_name, item.unit_price, accum.size);
      const unit = Number(item.unit_price ?? tier.unit_price) || 0;
      const lineRevenue = unit * qty * days;
      tier.tickets_sold += qty;
      tier.gross_revenue = Number((tier.gross_revenue + lineRevenue).toFixed(2));
      touched.add(levelId);
    }
    for (const id of touched) {
      accum.get(id).booking_count += 1;
    }
  }

  const tiers = [...accum.values()].sort((a, b) => b.tickets_sold - a.tickets_sold || a.level_name.localeCompare(b.level_name));
  const totalTickets = tiers.reduce((s, t) => s + t.tickets_sold, 0);
  const totalTierRevenue = tiers.reduce((s, t) => s + t.gross_revenue, 0);

  return {
    tiers: tiers.map((t) => ({
      ...t,
      share_tickets_pct:
        totalTickets > 0 ? Number(((t.tickets_sold / totalTickets) * 100).toFixed(1)) : 0,
      share_revenue_pct:
        totalTierRevenue > 0 ? Number(((t.gross_revenue / totalTierRevenue) * 100).toFixed(1)) : 0
    })),
    configured_levels: configuredLevels.map((l, index) => ({
      id: l.id,
      name: l.name,
      price: l.price,
      tier_key: resolveTicketTierKey(l, index, configuredLevels),
      color: chartColorForTierKey(resolveTicketTierKey(l, index, configuredLevels))
    })),
    total_tier_tickets: totalTickets,
    total_tier_revenue: Number(totalTierRevenue.toFixed(2))
  };
}

async function getTicketTierBookingRows(eventId) {
  const [rows] = await pool.query(
    `SELECT ticket_items_json, attendee_count, total_days, total_amount, subtotal_amount,
            payment_status, created_at
     FROM event_bookings
     WHERE event_id = ? AND payment_status IN ('paid', 'free')`,
    [eventId]
  );
  return rows;
}

async function getBookingInsights(eventId, event = null) {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS total_bookings,
       COALESCE(SUM(attendee_count), 0) AS total_attendees,
       COALESCE(SUM(CASE WHEN payment_status IN ('paid', 'free') THEN total_amount ELSE 0 END), 0) AS gross_revenue,
       COALESCE(SUM(CASE WHEN payment_status IN ('paid', 'free') THEN discount_amount ELSE 0 END), 0) AS total_discounts,
       SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) AS paid_bookings,
       SUM(CASE WHEN payment_status = 'free' THEN 1 ELSE 0 END) AS free_bookings,
       SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) AS pending_bookings,
       SUM(CASE WHEN payment_status = 'failed' THEN 1 ELSE 0 END) AS failed_bookings,
       SUM(CASE WHEN created_at >= CURDATE() THEN 1 ELSE 0 END) AS bookings_today,
       SUM(CASE WHEN created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END) AS bookings_last_7_days
     FROM event_bookings
     WHERE event_id = ?`,
    [eventId]
  );

  const [trend] = await pool.query(
    `SELECT DATE(created_at) AS day,
            COUNT(*) AS bookings,
            COALESCE(SUM(attendee_count), 0) AS attendees,
            COALESCE(SUM(CASE WHEN payment_status IN ('paid', 'free') THEN total_amount ELSE 0 END), 0) AS revenue
     FROM event_bookings
     WHERE event_id = ? AND created_at >= DATE_SUB(CURDATE(), INTERVAL 29 DAY)
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    [eventId]
  );

  const row = rows[0] || {};
  const base = {
    total_bookings: Number(row.total_bookings) || 0,
    total_attendees: Number(row.total_attendees) || 0,
    gross_revenue: Number(row.gross_revenue) || 0,
    total_discounts: Number(row.total_discounts) || 0,
    paid_bookings: Number(row.paid_bookings) || 0,
    free_bookings: Number(row.free_bookings) || 0,
    pending_bookings: Number(row.pending_bookings) || 0,
    failed_bookings: Number(row.failed_bookings) || 0,
    bookings_today: Number(row.bookings_today) || 0,
    bookings_last_7_days: Number(row.bookings_last_7_days) || 0,
    trend: trend.map((t) => ({
      day: t.day,
      bookings: Number(t.bookings) || 0,
      attendees: Number(t.attendees) || 0,
      revenue: Number(t.revenue) || 0
    }))
  };

  if (event) {
    const tierRows = await getTicketTierBookingRows(eventId);
    return { ...base, ...buildTierInsightsFromBookings(event, tierRows) };
  }

  return { ...base, tiers: [], configured_levels: [], total_tier_tickets: 0, total_tier_revenue: 0 };
}

async function getOrganizerInsightsSummary(organizerId) {
  const rows = await listEventsByOrganizer(organizerId);
  const eventIds = rows.map((e) => String(e.id));
  let gaMap = {};

  if (googleAnalytics.isConfigured() && eventIds.length) {
    try {
      gaMap = await googleAnalytics.listOrganizerEventSummaries(eventIds);
    } catch (err) {
      console.error("GA summary error:", err?.message || err);
    }
  }

  const events = rows.map((row) => ({
    id: row.id,
    title: row.title,
    status: row.status,
    ticket_sales_mode: row.ticket_sales_mode,
    total_page_views: gaMap[String(row.id)]?.total_page_views ?? 0,
    views_today: gaMap[String(row.id)]?.views_today ?? 0
  }));

  return { events, ga_configured: googleAnalytics.isConfigured() };
}

async function buildEventInsightsPayload(event, { hourlyDate } = {}) {
  const eventId = Number(event.id);
  const withSeats = await attachEventSeatAvailability(event);
  const ticketMode = event.ticket_sales_mode || "external";
  const isPlatform = ticketMode === "platform";
  let dbEventClicks = 0;
  try {
    dbEventClicks = await getEventClickCount(eventId);
  } catch (_err) {
    dbEventClicks = Number(event.click_count) || 0;
  }

  let traffic = {
    total_views: 0,
    views_today: 0,
    views_yesterday: 0,
    views_last_7_days: 0,
    views_last_30_days: 0,
    live_views_30m: 0,
    live_sessions_30m: 0,
    total_clicks: 0,
    event_clicks: 0,
    external_clicks: 0,
    ticket_clicks: 0,
    time_series: [],
    sources: [],
    cities: [],
    countries: [],
    devices: [],
    hourly_today: [],
    hourly_chart: null,
    event_clicks: dbEventClicks
  };

  let trafficMetrics = null;
  if (googleAnalytics.isConfigured()) {
    try {
      const realtimeSnapshot = await googleAnalytics.getRealtimeEventMetrics(eventId, event.title);
      const [metrics, clicks, timeSeries, sources, geo, devices, hourlyChart] = await Promise.all([
        googleAnalytics.getEventTrafficMetrics(eventId, {
          eventTitle: event.title,
          realtime: realtimeSnapshot
        }),
        googleAnalytics.getEventClickMetrics(eventId),
        googleAnalytics.getEventViewsTimeSeries(eventId, 30),
        googleAnalytics.getEventTrafficSources(eventId, 12),
        googleAnalytics.getEventGeoBreakdown(eventId, 24),
        googleAnalytics.getEventDeviceBreakdown(eventId),
        googleAnalytics.getEventHourlyChart(eventId, {
          eventTitle: event.title,
          dateStr: hourlyDate,
          realtime: realtimeSnapshot
        })
      ]);
      trafficMetrics = metrics;
      const clickMetrics = clicks;

      traffic = {
        total_views: metrics.total_views,
        views_today: metrics.views_today,
        views_yesterday: metrics.views_yesterday,
        views_last_7_days: metrics.views_last_7_days,
        views_last_30_days: metrics.views_last_30_days,
        active_users_30d: metrics.active_users_30d,
        reporting_timezone: metrics.reporting_timezone,
        reporting_timezone_label: metrics.reporting_timezone_label,
        today_date: metrics.today_date,
        yesterday_date: metrics.yesterday_date,
        live_views_30m: metrics.live_views_30m,
        live_sessions_30m: metrics.live_sessions_30m,
        realtime_proxy: Boolean(metrics.realtime_proxy),
        data_sources: metrics.data_sources || {},
        total_clicks: clickMetrics.total_clicks,
        event_clicks: Math.max(dbEventClicks, Number(clickMetrics.event_clicks) || 0),
        external_clicks: clickMetrics.external_clicks,
        ticket_clicks: clickMetrics.ticket_clicks,
        tier_cart_adds: clickMetrics.tier_cart_adds,
        bookings_completed: clickMetrics.bookings_completed,
        time_series: timeSeries,
        sources,
        cities: geo.cities,
        countries: geo.countries,
        devices,
        hourly_today: hourlyChart.hourly_today,
        hourly_chart: hourlyChart.hourly_chart
      };
    } catch (err) {
      console.error("GA event insights error:", err?.message || err);
    }
  }

  let bookings = null;

  try {
    dbEventClicks = await getEventClickCount(eventId);
  } catch (_err) {
    dbEventClicks = Number(event.click_count) || 0;
  }
  traffic.event_clicks = Math.max(Number(traffic.event_clicks) || 0, dbEventClicks);

  if (isPlatform) {
    bookings = await getBookingInsights(eventId, event);
    const dbBookingsDone = (bookings.paid_bookings || 0) + (bookings.free_bookings || 0);
    const dbTierTickets = Number(bookings.total_tier_tickets) || 0;
    traffic.bookings_completed = dbBookingsDone;
    traffic.tier_cart_adds = dbTierTickets;
  }

  let analyticsNote = googleAnalytics.getSetupNote();
  if (googleAnalytics.isConfigured()) {
    if (trafficMetrics?.realtime_proxy) {
      analyticsNote =
        "Your event is getting attention. Detailed charts and traffic sources will fill in over the next day or two.";
    } else if (traffic.total_views === 0 && traffic.views_today === 0) {
      const debugHint = await googleAnalytics.getDebugTrafficHint();
      if (debugHint) {
        analyticsNote = debugHint;
      } else {
        const dimensionHint = await googleAnalytics.getCustomDimensionSetupHint(eventId);
        if (dimensionHint) {
          analyticsNote = dimensionHint;
        }
      }
    }
  }

  return {
    event: {
      id: event.id,
      title: event.title,
      status: event.status,
      ticket_sales_mode: ticketMode,
      city_name: withSeats.city_name || event.city_name,
      venue_name: event.venue_name || event.venue,
      venue_address: event.venue_address,
      total_seats: parseTotalSeats(withSeats.total_seats),
      booked_seats: withSeats.booked_seats,
      seats_remaining: withSeats.seats_remaining,
      ticket_levels: parseTicketLevelsFromEvent(event)
    },
    traffic,
    bookings,
    ga_configured: googleAnalytics.isConfigured(),
    analytics_note: analyticsNote
  };
}

async function getOrganizerEventInsights(organizerId, eventIdParam, options = {}) {
  const eventId = Number(eventIdParam);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    throw new ApiError(400, "Invalid event id");
  }

  const event = await assertOrganizerOwnsEvent(eventId, organizerId);
  return buildEventInsightsPayload(event, options);
}

async function getAdminEventInsights(eventIdParam, options = {}) {
  const eventId = Number(eventIdParam);
  if (!Number.isFinite(eventId) || eventId <= 0) {
    throw new ApiError(400, "Invalid event id");
  }

  const event = await findEventById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  return buildEventInsightsPayload(event, options);
}

module.exports = {
  getOrganizerInsightsSummary,
  getOrganizerEventInsights,
  getAdminEventInsights
};
