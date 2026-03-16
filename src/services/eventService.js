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
  deleteEventByOrganizer
} = require("../models/eventModel");
const { getPagination } = require("../utils/pagination");
const { getMonthRange } = require("../utils/dateRange");

async function submitEvent(payload, organizerId) {
  let eventId;
  try {
    eventId = await createEvent({ ...payload, organizer_id: organizerId });
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

async function fetchEvents(query) {
  const pagination = getPagination(query);
  const search = query.q || query.search || null;
  const { monthStart, monthEnd } = getMonthRange(query.month || null);
  const filters = {
    status: query.status || "approved",
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
    sortOrder: query.sort_order || "asc"
  };

  const data = await listEvents({ filters, pagination });
  return {
    ...data,
    page: pagination.page,
    limit: pagination.limit
  };
}

async function fetchEventById(eventId) {
  const event = await findPublicEventById(eventId);
  if (!event) {
    throw new ApiError(404, "Event not found");
  }
  return event;
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

  const updated = await updateEventByOrganizer({
    eventId,
    organizerId,
    updates: payload
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

module.exports = {
  submitEvent,
  approveEvent,
  rejectEvent,
  fetchEvents,
  fetchEventById,
  fetchMySubmissions,
  editOwnEvent,
  deleteOwnEvent
};
