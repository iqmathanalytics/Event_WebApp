const ApiError = require("../utils/ApiError");
const { createAdminNotification } = require("../models/adminModel");
const {
  createEvent,
  countApprovedEventsByOrganizer,
  updateEventStatus,
  findEventById,
  findEventDetailBySlugOrIdForViewer,
  listEvents,
  listEventsByOrganizer,
  updateEventByOrganizer,
  publishOrganizerEvent,
  deleteEventByOrganizer,
  listFeaturedEvents,
  listSpotlightEvents,
  incrementEventPopularity
} = require("../models/eventModel");
const { getPagination } = require("../utils/pagination");
const {
  attachEventSeatAvailability,
  parseTotalSeats,
  requiresTotalSeats
} = require("../utils/eventSeats");
const { attachTicketLevelAvailability } = require("../utils/eventTicketLevelAvailability");
const couponModel = require("../models/couponModel");
const { getMonthRange } = require("../utils/dateRange");
const { getPrimaryEventDate, normalizeDateList, parseDateOnly } = require("../utils/eventSchedule");
const {
  normalizeTicketSalesMode,
  pickTicketSalesModeFromPayload
} = require("../utils/eventTicketSalesMode");
const { normalizeSeatingMode } = require("../utils/seatingMode");
const seatsioService = require("./seatsioService");
const {
  sanitizeTicketLevelsForSave,
  assertValidTicketLevelsForPlatform
} = require("../utils/eventTicketLevels");
const { findUserById } = require("../models/userModel");
const { sanitizeEventDescription } = require("../utils/sanitizeRichText");

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

const EVENT_TAG_RULES = Object.freeze({
  hotSellingMinBookings: 5,
  /** Stored GA page views (last 7 days) — synced off the request path. */
  trendingMinViews7d: 3,
  trendingMinViews30d: 10,
  rareCategoryMaxEvents: 2
});

function isYayDealEventRow(row) {
  return (
    row?.is_yay_deal_event === 1 ||
    row?.is_yay_deal_event === true ||
    String(row?.is_yay_deal_event || "") === "1"
  );
}

const {
  withSponsorTicketLevelForViewer,
  isSponsorTicketsEnabled
} = require("../utils/sponsorTickets");

function sanitizePublicEventForViewer(event, viewerUser) {
  if (!event) {
    return event;
  }
  const next = { ...event };
  const sponsorOn =
    next.sponsor_inquiry_enabled === true ||
    next.sponsor_inquiry_enabled === 1 ||
    String(next.sponsor_inquiry_enabled || "") === "1";
  const influencerOn =
    next.influencer_partner_enabled === true ||
    next.influencer_partner_enabled === 1 ||
    String(next.influencer_partner_enabled || "") === "1";
  next.sponsor_inquiry_enabled = Boolean(sponsorOn);
  next.influencer_partner_enabled = Boolean(influencerOn);
  if (!sponsorOn) {
    delete next.sponsor_contact_email;
    delete next.sponsor_contact_phone;
  }
  if (!influencerOn) {
    delete next.influencer_partner_contact_email;
    delete next.influencer_partner_contact_phone;
  }
  next.sponsor_tickets_enabled = isSponsorTicketsEnabled(next);
  const authed = Boolean(viewerUser && viewerUser.id);
  if (isYayDealEventRow(next) && !authed) {
    delete next.deal_event_discount_code;
  }
  return withSponsorTicketLevelForViewer(next, viewerUser);
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

/**
 * Popularity for cards/sort comes from stored GA columns (synced off the request path).
 * Until the first sync, keep the legacy DB score so sort/tags still have a signal.
 */
function withStoredPopularityMetrics(rows) {
  if (!rows?.length) {
    return rows;
  }
  return rows.map((row) => {
    const views30d = toNumber(row.ga_page_views_30d);
    const views7d = toNumber(row.ga_page_views_7d);
    return {
      ...row,
      ga_page_views_30d: views30d,
      ga_page_views_7d: views7d,
      popularity_score: views30d || toNumber(row.popularity_score)
    };
  });
}

/** Sort listings by calendar date only (earliest show date), not time or popularity. */
function sortRowsByEventDate(rows, order = "asc") {
  const desc = String(order).toLowerCase() === "desc";
  return [...rows].sort((a, b) => {
    const da = getPrimaryEventDate(a) || parseDateOnly(a?.event_date) || "";
    const db = getPrimaryEventDate(b) || parseDateOnly(b?.event_date) || "";
    if (da !== db) {
      return desc ? db.localeCompare(da) : da.localeCompare(db);
    }
    return String(a?.id ?? "").localeCompare(String(b?.id ?? ""), undefined, { numeric: true });
  });
}

function isHomeFeaturedRow(event) {
  const value = event?.home_featured;
  if (value === true || value === 1 || value === "1" || value === "true") {
    return true;
  }
  if (value && typeof value === "object" && Array.isArray(value.data)) {
    return Number(value.data[0]) === 1;
  }
  return false;
}

function dedupeEventsById(rows) {
  const seen = new Set();
  const out = [];
  for (const row of rows || []) {
    if (!row || row.id == null) {
      continue;
    }
    const id = String(row.id);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    out.push(row);
  }
  return out;
}

function sortRowsWithHomeFeaturedFirst(rows) {
  return [...(rows || [])].sort((a, b) => {
    const pa = isHomeFeaturedRow(a) ? 1 : 0;
    const pb = isHomeFeaturedRow(b) ? 1 : 0;
    if (pa !== pb) {
      return pb - pa;
    }
    if (!pa) {
      return 0;
    }
    const ta = Date.parse(a?.home_featured_at || 0) || 0;
    const tb = Date.parse(b?.home_featured_at || 0) || 0;
    return tb - ta;
  });
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

  if (Object.prototype.hasOwnProperty.call(createPayload, "description")) {
    createPayload.description = sanitizeEventDescription(createPayload.description);
  }

  const chartKey = String(createPayload.seatsio_chart_key || "").trim();
  if (normalizeSeatingMode(createPayload.seating_mode) === "reserved" && !chartKey) {
    throw new ApiError(
      400,
      "Design and confirm a seating chart before saving a seated event."
    );
  }

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

  if (normalizeSeatingMode(createPayload.seating_mode) === "reserved" && chartKey) {
    try {
      await seatsioService.saveOrganizerSeatingConfig(eventId, organizerId, {
        seating_mode: "reserved",
        chart_key: chartKey
      });
    } catch (err) {
      // Event already created — surface seating link failure clearly.
      throw err instanceof ApiError
        ? err
        : new ApiError(400, err?.message || "Event created, but seating chart could not be linked.");
    }
  }

  if (!autoApproved) {
    await notifyAdminSafe({
      type: "event_submitted",
      entityType: "event",
      entityId: eventId,
      title: "New event submitted",
      message: `Event #${eventId} is awaiting moderation.`
    });
  }

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
  const sortByPrice = sort === "price";

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
    sortBy: sort,
    sortOrder: query.sort_order || (sortByPopularity ? "desc" : "asc"),
    futureOnly: status === "approved" && !query.date && !query.month
  };

  const data = await listEvents({ filters, pagination });
  let rows = withStoredPopularityMetrics(data.rows || []);

  // Spotlight pin is for discovery sorts — skip it when ordering by price.
  if (pagination.page === 1 && status === "approved" && !sortByPrice) {
    const spotlightRows = withStoredPopularityMetrics(
      await listSpotlightEvents({
        categoryId: filters.categoryId,
        q: filters.q,
        date: filters.date,
        limit: 24
      })
    );
    if (spotlightRows.length) {
      const rest = rows.filter((row) => !isHomeFeaturedRow(row));
      const merged = dedupeEventsById([...spotlightRows, ...rest]);
      rows =
        spotlightRows.length >= pagination.limit
          ? merged.filter(isHomeFeaturedRow)
          : merged.slice(0, pagination.limit);
    }
  }

  rows = rows
    .map(attachDynamicEventTags)
    .map((row) => sanitizePublicEventForViewer(row, viewerUser));

  if (sort === "event_date") {
    rows = sortRowsByEventDate(rows, filters.sortOrder);
  }
  if (sortByPrice) {
    const desc = String(filters.sortOrder).toLowerCase() === "desc";
    rows = [...rows].sort((a, b) => {
      const pa = Number(a?.price);
      const pb = Number(b?.price);
      const na = Number.isFinite(pa) ? pa : desc ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
      const nb = Number.isFinite(pb) ? pb : desc ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY;
      if (na !== nb) {
        return desc ? nb - na : na - nb;
      }
      return String(a?.id ?? "").localeCompare(String(b?.id ?? ""), undefined, { numeric: true });
    });
  } else {
    rows = sortRowsWithHomeFeaturedFirst(rows);
  }

  return {
    ...data,
    rows,
    page: pagination.page,
    limit: pagination.limit
  };
}

async function fetchEventById(slugOrId, viewerUser) {
  const resolved = await findEventDetailBySlugOrIdForViewer(slugOrId, viewerUser);
  const event = resolved?.event;
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  const [withPopularity] = withStoredPopularityMetrics([event]);
  const enriched = attachDynamicEventTags({
    ...withPopularity,
    display_date: getPrimaryEventDate(withPopularity)
  });
  const withSeats = await attachEventSeatAvailability(enriched);
  const withLevelSeats = await attachTicketLevelAvailability(withSeats);
  let checkoutCouponsAvailable = false;
  const couponsEnabledForEvent = !(
    withLevelSeats?.coupon_codes_enabled === false ||
    Number(withLevelSeats?.coupon_codes_enabled) === 0
  );
  if (
    couponsEnabledForEvent &&
    withLevelSeats?.id &&
    withLevelSeats?.organizer_id &&
    normalizeTicketSalesMode(withLevelSeats.ticket_sales_mode) === "platform"
  ) {
    checkoutCouponsAvailable =
      (await couponModel.countActiveCouponsForEvent(withLevelSeats.id, withLevelSeats.organizer_id)) > 0;
  }
  const sanitized = sanitizePublicEventForViewer(
    { ...withLevelSeats, checkout_coupons_available: checkoutCouponsAvailable },
    viewerUser
  );
  if (resolved.viewerPreview) {
    sanitized.viewer_preview = true;
  }
  return sanitized;
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
  const nextSeatingMode = Object.prototype.hasOwnProperty.call(normalizedPayload, "seating_mode")
    ? normalizedPayload.seating_mode
    : existing.seating_mode;
  const nextTotalSeats = Object.prototype.hasOwnProperty.call(normalizedPayload, "total_seats")
    ? parseTotalSeats(normalizedPayload.total_seats)
    : parseTotalSeats(existing.total_seats);
  if (requiresTotalSeats(nextTicketMode, nextSeatingMode) && !nextTotalSeats) {
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
  if (Object.prototype.hasOwnProperty.call(updates, "description")) {
    updates.description = sanitizeEventDescription(updates.description);
  }
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

  const chartKey = String(
    payload.seatsio_chart_key || normalizedPayload.seatsio_chart_key || existing.seatsio_chart_key || ""
  ).trim();
  const seatingMode = normalizeSeatingMode(
    Object.prototype.hasOwnProperty.call(normalizedPayload, "seating_mode")
      ? normalizedPayload.seating_mode
      : existing.seating_mode
  );
  if (seatingMode === "reserved" && !chartKey) {
    throw new ApiError(
      400,
      "Design and confirm a seating chart before saving a seated event."
    );
  }
  if (seatingMode === "reserved" && chartKey) {
    await seatsioService.saveOrganizerSeatingConfig(eventId, organizerId, {
      seating_mode: "reserved",
      chart_key: chartKey
    });
  }

  await publishOrganizerEvent({ eventId, organizerId });

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
  const feedLimit = Number(limit) || 6;
  const [spotlightRows, feedRows] = await Promise.all([
    listSpotlightEvents({ limit: 24 }),
    listFeaturedEvents({ cityId, limit: feedLimit })
  ]);
  let rows = withStoredPopularityMetrics(dedupeEventsById([...spotlightRows, ...feedRows]));
  rows = sortRowsWithHomeFeaturedFirst(sortRowsByEventDate(rows, "asc"));
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

async function touchEventPresence(slugOrId, { session_key: sessionKey } = {}) {
  const eventId = resolveEventIdFromParam(slugOrId);
  const { touchEventPagePresence } = require("../models/eventPagePresenceModel");
  return touchEventPagePresence({ eventId, sessionKey });
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
  trackEventView,
  touchEventPresence
};
