const ApiError = require("../utils/ApiError");
const { createAdminNotification } = require("../models/adminModel");
const {
  createEvent,
  countApprovedEventsByOrganizer,
  updateEventStatus,
  findEventById,
  findPublicEventBySlugOrId,
  listEvents,
  listEventsByOrganizer,
  updateEventByOrganizer,
  publishOrganizerEvent,
  deleteEventByOrganizer,
  listFeaturedEvents,
  incrementEventPopularity
} = require("../models/eventModel");
const { getPagination } = require("../utils/pagination");
const {
  attachEventSeatAvailability,
  parseTotalSeats,
  requiresTotalSeats
} = require("../utils/eventSeats");
const { attachTicketLevelAvailability } = require("../utils/eventTicketLevelAvailability");
const { getMonthRange } = require("../utils/dateRange");
const { getPrimaryEventDate, normalizeDateList, parseDateOnly } = require("../utils/eventSchedule");
const {
  normalizeTicketSalesMode,
  pickTicketSalesModeFromPayload
} = require("../utils/eventTicketSalesMode");
const {
  sanitizeTicketLevelsForSave,
  assertValidTicketLevelsForPlatform
} = require("../utils/eventTicketLevels");
const { findUserById } = require("../models/userModel");

async function userCanSellPlatformTickets(userId, { role } = {}) {
  if (role === "admin") {
    return true;
  }
  try {
    const user = await findUserById(userId);
    return user?.can_sell_platform_tickets === 1;
  } catch (err) {
    if (err?.code === "ER_BAD_FIELD_ERROR") {
      return false;
    }
    throw err;
  }
}

async function resolveOrganizerTicketSalesMode(organizerId, requestedMode, existingMode, { role } = {}) {
  const mode = normalizeTicketSalesMode(requestedMode ?? existingMode ?? "external");
  if (mode !== "platform") {
    return mode;
  }
  const allowed = await userCanSellPlatformTickets(organizerId, { role });
  if (allowed) {
    return "platform";
  }
  const existing = normalizeTicketSalesMode(existingMode);
  if (existing === "platform") {
    return "platform";
  }
  throw new ApiError(
    403,
    "On-site ticket sales are not enabled for your account. Submit a hosting request from your user dashboard."
  );
}
const googleAnalytics = require("./googleAnalyticsService");

const EVENT_TAG_RULES = Object.freeze({
  hotSellingMinBookings: 5,
  /** GA page views (last 7 days) — not legacy DB click/view counters. */
  trendingMinViews7d: 3,
  trendingMinViews30d: 10,
  rareCategoryMaxEvents: 2
});

const GA_POPULARITY_FETCH_CAP = 500;

function isYayDealEventRow(row) {
  return (
    row?.is_yay_deal_event === 1 ||
    row?.is_yay_deal_event === true ||
    String(row?.is_yay_deal_event || "") === "1"
  );
}

function sanitizePublicEventForViewer(event, viewerUser) {
  if (!event) {
    return event;
  }
  const authed = Boolean(viewerUser && viewerUser.id);
  if (isYayDealEventRow(event) && !authed) {
    const next = { ...event };
    delete next.deal_event_discount_code;
    return next;
  }
  return event;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Popularity for cards/sort comes only from GA4 page_view + bmt_event_id (not DB counters).
 */
async function applyGaPopularityMetrics(rows) {
  if (!rows?.length) {
    return rows;
  }
  if (!googleAnalytics.isConfigured()) {
    return rows.map((row) => ({
      ...row,
      popularity_score: 0,
      ga_page_views_30d: 0,
      ga_page_views_7d: 0
    }));
  }
  try {
    const eventIds = rows.map((r) => String(r.id));
    const [map30, map7] = await Promise.all([
      googleAnalytics.getEventPageViewsMap(eventIds, 30),
      googleAnalytics.getEventPageViewsMap(eventIds, 7)
    ]);
    return rows.map((row) => {
      const id = String(row.id);
      const views30d = map30[id] || 0;
      const views7d = map7[id] || 0;
      return {
        ...row,
        popularity_score: views30d,
        ga_page_views_30d: views30d,
        ga_page_views_7d: views7d
      };
    });
  } catch (err) {
    console.error("GA popularity error:", err?.message || err);
    return rows.map((row) => ({
      ...row,
      popularity_score: 0,
      ga_page_views_30d: 0,
      ga_page_views_7d: 0
    }));
  }
}

function sortRowsByPopularity(rows) {
  return [...rows].sort(
    (a, b) => toNumber(b.ga_page_views_30d ?? b.popularity_score) - toNumber(a.ga_page_views_30d ?? a.popularity_score)
  );
}

function attachDynamicEventTags(event) {
  const bookingCount = toNumber(event.booking_count);
  const views30d = toNumber(event.ga_page_views_30d);
  const views7d = toNumber(event.ga_page_views_7d);
  const categoryEventCount = toNumber(event.category_event_count);
  const manualOneOfAKind =
    event.one_of_a_kind_manual === 1 ||
    event.one_of_a_kind_manual === true ||
    String(event.one_of_a_kind_manual || "0") === "1";

  const tags = [];
  if (bookingCount >= EVENT_TAG_RULES.hotSellingMinBookings) {
    tags.push("Hot Selling");
  }
  if (
    views7d >= EVENT_TAG_RULES.trendingMinViews7d ||
    views30d >= EVENT_TAG_RULES.trendingMinViews30d
  ) {
    tags.push("Trending");
  }
  if (
    manualOneOfAKind ||
    categoryEventCount <= EVENT_TAG_RULES.rareCategoryMaxEvents ||
    event.schedule_type === "multiple" ||
    event.schedule_type === "range"
  ) {
    tags.push("One of a Kind");
  }

  return {
    ...event,
    tags
  };
}

function normalizeEventSchedulePayload(payload) {
  const scheduleType = payload.schedule_type || "single";
  if (scheduleType === "multiple") {
    const eventDates = normalizeDateList(payload.event_dates || []);
    const primaryDate = eventDates[0] || parseDateOnly(payload.event_date);
    return {
      ...payload,
      schedule_type: "multiple",
      event_dates: eventDates,
      event_date: primaryDate,
      event_start_date: null,
      event_end_date: null
    };
  }
  if (scheduleType === "range") {
    const startDate = parseDateOnly(payload.event_start_date) || parseDateOnly(payload.event_date);
    const endDate = parseDateOnly(payload.event_end_date) || startDate;
    return {
      ...payload,
      schedule_type: "range",
      event_date: startDate,
      event_start_date: startDate,
      event_end_date: endDate,
      event_dates: []
    };
  }
  const singleDate = parseDateOnly(payload.event_date);
  return {
    ...payload,
    schedule_type: "single",
    event_date: singleDate,
    event_start_date: null,
    event_end_date: null,
    event_dates: []
  };
}

function applyTicketLevelsToPayload(payload, ticketMode) {
  const saved = sanitizeTicketLevelsForSave(payload.ticket_levels ?? payload.ticket_levels_json, {
    platformMode: ticketMode === "platform"
  });
  if (ticketMode === "platform" && saved.levels.length) {
    assertValidTicketLevelsForPlatform(saved.levels);
    return {
      ...payload,
      ticket_levels_json: saved.json,
      price: saved.displayPrice ?? 0
    };
  }
  if (ticketMode === "platform") {
    return { ...payload, ticket_levels_json: saved.json };
  }
  return { ...payload, ticket_levels_json: null };
}

function pickOrganizerUpdates(rawPayload, normalizedPayload) {
  const updates = {};
  for (const key of Object.keys(rawPayload || {})) {
    if (key === "ticketSalesMode") {
      continue;
    }
    if (Object.prototype.hasOwnProperty.call(normalizedPayload, key)) {
      updates[key] = normalizedPayload[key];
    }
  }
  if (
    Object.prototype.hasOwnProperty.call(rawPayload, "ticket_levels") &&
    Object.prototype.hasOwnProperty.call(normalizedPayload, "ticket_levels_json")
  ) {
    updates.ticket_levels_json = normalizedPayload.ticket_levels_json;
    delete updates.ticket_levels;
    if (normalizedPayload.price != null) {
      updates.price = normalizedPayload.price;
    }
  }
  return updates;
}

async function notifyAdminSafe(notification) {
  try {
    await createAdminNotification(notification);
  } catch (_err) {
    /* notification must never block organizer save */
  }
}

async function submitEvent(payload, organizerId, { role } = {}) {
  const normalizedPayload = normalizeEventSchedulePayload(payload);
  const modeSource = pickTicketSalesModeFromPayload(normalizedPayload);
  const ticketMode = await resolveOrganizerTicketSalesMode(organizerId, modeSource, null, { role });
  const forCreate = applyTicketLevelsToPayload(
    {
      ...normalizedPayload,
      ticket_sales_mode: ticketMode
    },
    ticketMode
  );
  const approvedCount = await countApprovedEventsByOrganizer(organizerId);
  const autoApproved = approvedCount > 0;
  const { status: _clientStatus, ...createPayload } = forCreate;

  let eventId;
  try {
    eventId = await createEvent({
      ...createPayload,
      organizer_id: organizerId,
      status: autoApproved ? "approved" : "pending"
    });
  } catch (err) {
    if (err?.code === "ER_NO_REFERENCED_ROW_2") {
      throw new ApiError(400, "Selected city or category is invalid. Please reselect and try again.");
    }
    if (err?.code === "ER_BAD_FIELD_ERROR") {
      throw new ApiError(
        500,
        "Event schema is not up to date in the database. Please run the latest event migration scripts."
      );
    }
    if (err?.code === "ER_WRONG_VALUE_COUNT_ON_ROW") {
      throw new ApiError(500, "Event create failed: database column mismatch. Please run the latest SQL migrations.");
    }
    if (err?.code === "ER_INVALID_JSON_TEXT") {
      throw new ApiError(
        500,
        "Could not save YouTube promo video links. Run npm run db:migrate and restart the API server."
      );
    }
    throw err;
  }

  await notifyAdminSafe({
    type: "event_submitted",
    entityType: "event",
    entityId: eventId,
    title: autoApproved ? "New event published" : "New event submitted",
    message: autoApproved
      ? `Event #${eventId} was posted by a verified organizer and is live (auto-approved).`
      : `Event #${eventId} is awaiting moderation.`
  });

  return { eventId, autoApproved, status: autoApproved ? "approved" : "pending" };
}

async function approveEvent(eventId, adminId, note) {
  const existing = await findEventById(eventId);
  if (!existing) {
    throw new ApiError(404, "Event not found");
  }
  const updated = await updateEventStatus({
    eventId,
    status: "approved",
    adminId,
    reviewNote: note
  });
  if (!updated) {
    throw new ApiError(400, "Could not approve event");
  }
}

async function rejectEvent(eventId, adminId, note) {
  const existing = await findEventById(eventId);
  if (!existing) {
    throw new ApiError(404, "Event not found");
  }
  const updated = await updateEventStatus({
    eventId,
    status: "rejected",
    adminId,
    reviewNote: note
  });
  if (!updated) {
    throw new ApiError(400, "Could not reject event");
  }
}

async function fetchEvents(query, viewerUser) {
  const pagination = getPagination(query);
  const search = query.q || query.search || null;
  const { monthStart, monthEnd } = getMonthRange(query.month || null);
  const status = query.status || "approved";
  const sort = query.sort || "event_date";
  const sortByPopularity = sort === "popularity";
  const useGaPopularitySort = sortByPopularity && googleAnalytics.isConfigured();

  const filters = {
    status,
    publicListedOnly: status === "approved",
    cityId: query.city ? Number(query.city) : null,
    categoryId: query.category ? Number(query.category) : null,
    date: query.date || null,
    time: query.time || null,
    monthStart,
    monthEnd,
    priceMin: query.price_min ? Number(query.price_min) : null,
    priceMax: query.price_max ? Number(query.price_max) : null,
    q: search,
    sortBy: useGaPopularitySort ? "newest" : sort,
    sortOrder: query.sort_order || "asc",
    futureOnly: status === "approved" && !query.date && !query.month
  };

  const listPagination = useGaPopularitySort
    ? { page: 1, limit: GA_POPULARITY_FETCH_CAP, offset: 0 }
    : pagination;

  const data = await listEvents({ filters, pagination: listPagination });
  let rows = await applyGaPopularityMetrics(data.rows || []);

  if (useGaPopularitySort) {
    rows = sortRowsByPopularity(rows);
    const total = rows.length;
    const start = (pagination.page - 1) * pagination.limit;
    rows = rows.slice(start, start + pagination.limit);
    rows = rows
      .map(attachDynamicEventTags)
      .map((row) => sanitizePublicEventForViewer(row, viewerUser));
    return {
      ...data,
      total,
      rows,
      page: pagination.page,
      limit: pagination.limit
    };
  }

  rows = rows
    .map(attachDynamicEventTags)
    .map((row) => sanitizePublicEventForViewer(row, viewerUser));

  return {
    ...data,
    rows,
    page: pagination.page,
    limit: pagination.limit
  };
}

async function fetchEventById(slugOrId, viewerUser) {
  const event = await findPublicEventBySlugOrId(slugOrId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  const [withGaPopularity] = await applyGaPopularityMetrics([event]);
  const enriched = attachDynamicEventTags({
    ...withGaPopularity,
    display_date: getPrimaryEventDate(withGaPopularity)
  });
  const withSeats = await attachEventSeatAvailability(enriched);
  const withLevelSeats = await attachTicketLevelAvailability(withSeats);
  return sanitizePublicEventForViewer(withLevelSeats, viewerUser);
}

async function fetchMySubmissions(userId) {
  return listEventsByOrganizer(userId);
}

async function editOwnEvent(eventId, organizerId, payload, { role } = {}) {
  const existing = await findEventById(eventId);
  if (!existing) {
    throw new ApiError(404, "Event not found");
  }
  if (existing.organizer_id !== organizerId) {
    throw new ApiError(403, "You can only edit your own events");
  }

  const normalizedPayload = normalizeEventSchedulePayload({
    schedule_type: existing.schedule_type,
    event_date: existing.event_date,
    event_start_date: existing.event_start_date,
    event_end_date: existing.event_end_date,
    event_dates: existing.event_dates,
    ...payload
  });
  if (
    Object.prototype.hasOwnProperty.call(normalizedPayload, "ticket_sales_mode") ||
    Object.prototype.hasOwnProperty.call(normalizedPayload, "ticketSalesMode")
  ) {
    const requested = normalizedPayload.ticket_sales_mode ?? normalizedPayload.ticketSalesMode;
    normalizedPayload.ticket_sales_mode = await resolveOrganizerTicketSalesMode(
      organizerId,
      requested,
      existing.ticket_sales_mode,
      { role }
    );
    delete normalizedPayload.ticketSalesMode;
  }

  if (
    Object.prototype.hasOwnProperty.call(normalizedPayload, "is_yay_deal_event") &&
    !(
      normalizedPayload.is_yay_deal_event === true ||
      normalizedPayload.is_yay_deal_event === 1 ||
      String(normalizedPayload.is_yay_deal_event || "") === "1"
    )
  ) {
    normalizedPayload.deal_event_discount_code = null;
  }

  const nextTicketMode = Object.prototype.hasOwnProperty.call(normalizedPayload, "ticket_sales_mode")
    ? normalizedPayload.ticket_sales_mode
    : existing.ticket_sales_mode;
  const nextTotalSeats = Object.prototype.hasOwnProperty.call(normalizedPayload, "total_seats")
    ? parseTotalSeats(normalizedPayload.total_seats)
    : parseTotalSeats(existing.total_seats);
  if (requiresTotalSeats(nextTicketMode) && !nextTotalSeats) {
    throw new ApiError(400, "Total seats is required for on-site ticket booking (at least 1).");
  }
  if (normalizedPayload.ticket_sales_mode === "external") {
    normalizedPayload.total_seats = null;
  }

  const ticketModeForLevels = nextTicketMode || "external";
  if (
    Object.prototype.hasOwnProperty.call(normalizedPayload, "ticket_levels") ||
    Object.prototype.hasOwnProperty.call(normalizedPayload, "ticket_levels_json")
  ) {
    const withLevels = applyTicketLevelsToPayload(normalizedPayload, ticketModeForLevels);
    normalizedPayload.ticket_levels_json = withLevels.ticket_levels_json;
    if (withLevels.price != null) {
      normalizedPayload.price = withLevels.price;
    }
    delete normalizedPayload.ticket_levels;
  }

  const updates = pickOrganizerUpdates(payload, normalizedPayload);
  if (Object.keys(updates).length) {
    const updated = await updateEventByOrganizer({
      eventId,
      organizerId,
      updates
    });
    if (!updated) {
      throw new ApiError(400, "No valid fields provided for update");
    }
  }

  await publishOrganizerEvent({ eventId, organizerId });

  await notifyAdminSafe({
    type: "event_submitted",
    entityType: "event",
    entityId: eventId,
    title: "Event updated",
    message: `Event #${eventId} was updated by the organizer and is live (auto-published).`
  });

  return { skipReapproval: true, autoPublished: true, status: "approved" };
}

async function deleteOwnEvent(eventId, organizerId) {
  const existing = await findEventById(eventId);
  if (!existing) {
    throw new ApiError(404, "Event not found");
  }
  if (existing.organizer_id !== organizerId) {
    throw new ApiError(403, "You can only delete your own events");
  }

  const deleted = await deleteEventByOrganizer({
    eventId,
    organizerId
  });
  if (!deleted) {
    throw new ApiError(400, "Could not delete event");
  }
}

async function fetchFeaturedEvents({ city, limit }, viewerUser) {
  const cityId = city ? Number(city) : null;
  let rows = await listFeaturedEvents({ cityId, limit: Number(limit) || 6 });
  rows = await applyGaPopularityMetrics(rows);
  rows = sortRowsByPopularity(rows);
  return rows
    .map(attachDynamicEventTags)
    .map((row) => sanitizePublicEventForViewer(row, viewerUser));
}

function resolveEventIdFromParam(param) {
  const { id } = require("../utils/listingSlug").resolveListingIdFromParam(param);
  if (!id) {
    throw new ApiError(404, "Event not found");
  }
  return id;
}

async function trackEventClick(slugOrId) {
  const eventId = resolveEventIdFromParam(slugOrId);
  const result = await incrementEventPopularity({ eventId, delta: 1, clickDelta: 1, viewDelta: 0 });
  return result;
}

async function trackEventView(slugOrId) {
  const eventId = resolveEventIdFromParam(slugOrId);
  const result = await incrementEventPopularity({ eventId, delta: 2, clickDelta: 0, viewDelta: 1 });
  return result;
}

module.exports = {
  submitEvent,
  approveEvent,
  rejectEvent,
  fetchEvents,
  fetchEventById,
  fetchMySubmissions,
  editOwnEvent,
  deleteOwnEvent,
  fetchFeaturedEvents,
  trackEventClick,
  trackEventView
};
