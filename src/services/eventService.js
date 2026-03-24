const ApiError = require("../utils/ApiError");
const { createAdminNotification } = require("../models/adminModel");
const {
  createEvent,
  updateEventStatus,
  findEventById,
  findPublicEventById,
  listEvents,
  listEventsByOrganizer,
  updateEventByOrganizer,
  deleteEventByOrganizer,
  listFeaturedEvents,
  incrementEventPopularity
} = require("../models/eventModel");
const { getPagination } = require("../utils/pagination");
const { getMonthRange } = require("../utils/dateRange");
const { getPrimaryEventDate, normalizeDateList, parseDateOnly } = require("../utils/eventSchedule");

const EVENT_TAG_RULES = Object.freeze({
  hotSellingMinBookings: 5,
  trendingMinRecentEngagement: 20,
  trendingMinTotalEngagement: 30,
  rareCategoryMaxEvents: 2
});

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

function attachDynamicEventTags(event) {
  const bookingCount = toNumber(event.booking_count);
  const clickCount = toNumber(event.click_count);
  const viewCount = toNumber(event.view_count);
  const recentEngagement = toNumber(event.recent_engagement_score);
  const totalEngagement = clickCount + viewCount;
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
    recentEngagement >= EVENT_TAG_RULES.trendingMinRecentEngagement ||
    totalEngagement >= EVENT_TAG_RULES.trendingMinTotalEngagement
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

async function submitEvent(payload, organizerId) {
  const normalizedPayload = normalizeEventSchedulePayload(payload);
  let eventId;
  try {
    eventId = await createEvent({ ...normalizedPayload, organizer_id: organizerId });
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
    throw err;
  }

  await createAdminNotification({
    type: "event_submitted",
    entityType: "event",
    entityId: eventId,
    title: "New event submitted",
    message: `Event #${eventId} is awaiting moderation.`
  });

  return { eventId };
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

  const filters = {
    status,
    cityId: query.city ? Number(query.city) : null,
    categoryId: query.category ? Number(query.category) : null,
    date: query.date || null,
    time: query.time || null,
    monthStart,
    monthEnd,
    priceMin: query.price_min ? Number(query.price_min) : null,
    priceMax: query.price_max ? Number(query.price_max) : null,
    q: search,
    sortBy: query.sort || "newest",
    sortOrder: query.sort_order || "asc",
    // Hide expired events by default for approved events unless user explicitly filters by date/month.
    futureOnly: status === "approved" && !query.date && !query.month
  };

  const data = await listEvents({ filters, pagination });
  const rows = (data.rows || [])
    .map(attachDynamicEventTags)
    .map((row) => sanitizePublicEventForViewer(row, viewerUser));
  return {
    ...data,
    rows,
    page: pagination.page,
    limit: pagination.limit
  };
}

async function fetchEventById(eventId, viewerUser) {
  const event = await findPublicEventById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  const enriched = attachDynamicEventTags({
    ...event,
    display_date: getPrimaryEventDate(event)
  });
  return sanitizePublicEventForViewer(enriched, viewerUser);
}

async function fetchMySubmissions(userId) {
  return listEventsByOrganizer(userId);
}

async function editOwnEvent(eventId, organizerId, payload) {
  const existing = await findEventById(eventId);
  if (!existing) {
    throw new ApiError(404, "Event not found");
  }
  if (existing.organizer_id !== organizerId) {
    throw new ApiError(403, "You can only edit your own events");
  }

  const normalizedPayload = normalizeEventSchedulePayload(payload);
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

  const updated = await updateEventByOrganizer({
    eventId,
    organizerId,
    updates: normalizedPayload
  });
  if (!updated) {
    throw new ApiError(400, "No valid fields provided for update");
  }
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
  const rows = await listFeaturedEvents({ cityId, limit: Number(limit) || 6 });
  return rows
    .map(attachDynamicEventTags)
    .map((row) => sanitizePublicEventForViewer(row, viewerUser));
}

async function trackEventClick(eventId) {
  // Store clicks/views into popularity_score as a lightweight analytics store.
  return incrementEventPopularity({ eventId, delta: 1, clickDelta: 1, viewDelta: 0 });
}

async function trackEventView(eventId) {
  return incrementEventPopularity({ eventId, delta: 2, clickDelta: 0, viewDelta: 1 });
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
