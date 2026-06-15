const { SeatsioClient, Region } = require("seatsio");
const ApiError = require("../utils/ApiError");
const { findEventById } = require("../models/eventModel");
const { pool } = require("../config/db");
const { isReservedSeating, normalizeSeatingMode } = require("../utils/seatingMode");
const { normalizeTicketLevelsInput } = require("../utils/eventTicketLevels");
const { buildCartFromSelectedSeats } = require("../utils/seatSelection");

function resolveRegion() {
  const raw = String(process.env.SEATSIO_REGION || "na").trim().toLowerCase();
  const map = {
    na: Region.NA(),
    eu: Region.EU(),
    sa: Region.SA(),
    oc: Region.OC()
  };
  return map[raw] || Region.NA();
}

function isSeatsioConfigured() {
  return Boolean(process.env.SEATSIO_SECRET_KEY && process.env.SEATSIO_WORKSPACE_KEY);
}

function getWorkspaceKey() {
  return String(process.env.SEATSIO_WORKSPACE_KEY || "").trim();
}

function getClient() {
  const secret = String(process.env.SEATSIO_SECRET_KEY || "").trim();
  if (!secret) {
    throw new ApiError(503, "Reserved seating is not configured on the server.");
  }
  return new SeatsioClient(resolveRegion(), secret);
}

function publicRegion() {
  return String(process.env.SEATSIO_REGION || "na").trim().toLowerCase();
}

async function assertOrganizerOwnsEvent(eventId, organizerId) {
  const event = await findEventById(eventId);
  if (!event || Number(event.organizer_id) !== Number(organizerId)) {
    throw new ApiError(404, "Event not found");
  }
  return event;
}

async function updateEventSeatingKeys(eventId, patch) {
  const fields = [];
  const values = [];
  if (patch.seating_mode !== undefined) {
    fields.push("seating_mode = ?");
    values.push(normalizeSeatingMode(patch.seating_mode));
  }
  if (patch.seatsio_chart_key !== undefined) {
    fields.push("seatsio_chart_key = ?");
    values.push(patch.seatsio_chart_key || null);
  }
  if (patch.seatsio_event_key !== undefined) {
    fields.push("seatsio_event_key = ?");
    values.push(patch.seatsio_event_key || null);
  }
  if (!fields.length) {
    return;
  }
  fields.push("updated_at = NOW()");
  values.push(eventId);
  await pool.query(`UPDATE events SET ${fields.join(", ")} WHERE id = ?`, values);
}

function seatsioErrorCode(err) {
  return err?.errors?.[0]?.code || err?.response?.data?.errors?.[0]?.code || null;
}

function seatsioErrorMessage(err) {
  return (
    err?.errors?.[0]?.message ||
    err?.response?.data?.errors?.[0]?.message ||
    err?.message ||
    "Seats.io request failed."
  );
}

function throwSeatsioError(err, fallbackMessage) {
  const code = seatsioErrorCode(err);
  if (code === "DRAWING_VALIDATION_FAILED" || code === "VALIDATE_NO_OBJECTS") {
    throw new ApiError(
      400,
      "Add at least one seat or section in the designer, publish the chart, then save again."
    );
  }
  if (code === "DRAFT_DRAWING_NOT_FOUND") {
    throw new ApiError(
      400,
      "Publish your seating chart in the designer toolbar, then click Save seating chart."
    );
  }
  if (err instanceof ApiError) {
    throw err;
  }
  throw new ApiError(502, fallbackMessage || seatsioErrorMessage(err));
}

async function publishChartForEvent(client, chartKey) {
  try {
    await client.charts.publishDraftVersion(chartKey);
  } catch (err) {
    const code = seatsioErrorCode(err);
    if (code === "DRAFT_DRAWING_NOT_FOUND") {
      // Designer already published — published version is what we need.
      return;
    }
    throwSeatsioError(err, "Could not publish the seating chart.");
  }
}

async function ensureChartForEvent(event) {
  if (event.seatsio_chart_key) {
    return event.seatsio_chart_key;
  }
  const client = getClient();
  const chart = await client.charts.create();
  await updateEventSeatingKeys(event.id, { seatsio_chart_key: chart.key });
  return chart.key;
}

async function ensureSeatsioEventForPlatformEvent(event) {
  if (event.seatsio_event_key) {
    return event.seatsio_event_key;
  }
  const chartKey = await ensureChartForEvent(event);
  const client = getClient();
  await publishChartForEvent(client, chartKey);
  let seatsioEvent;
  try {
    seatsioEvent = await client.events.create(chartKey, {
      key: `bmt-event-${event.id}`
    });
  } catch (err) {
    const code = seatsioErrorCode(err);
    if (code === "EVENT_KEY_ALREADY_EXISTS") {
      return `bmt-event-${event.id}`;
    }
    throwSeatsioError(err, "Could not link seating chart to this event.");
  }
  const eventKey = seatsioEvent.key || `bmt-event-${event.id}`;
  await updateEventSeatingKeys(event.id, {
    seatsio_event_key: eventKey,
    seating_mode: "reserved"
  });
  return eventKey;
}

function buildPricingFromTicketLevels(ticketLevels = []) {
  const levels = normalizeTicketLevelsInput(ticketLevels);
  return levels.map((level, index) => ({
    category: index + 1,
    price: Number(level.price) || 0,
    label: level.name
  }));
}

function buildCartFromSelectedSeatsForBooking(selectedSeats = [], ticketLevels = [], totalDays = 1) {
  const levels = normalizeTicketLevelsInput(ticketLevels);
  return buildCartFromSelectedSeats(selectedSeats, levels, totalDays);
}

async function getOrganizerDesignerConfig(eventId, organizerId) {
  if (!isSeatsioConfigured()) {
    throw new ApiError(503, "Seats.io is not configured. Add SEATSIO_SECRET_KEY and SEATSIO_WORKSPACE_KEY.");
  }
  let event = await assertOrganizerOwnsEvent(eventId, organizerId);
  const chartKey = await ensureChartForEvent(event);
  event = await findEventById(eventId);
  return {
    configured: true,
    region: publicRegion(),
    workspace_key: getWorkspaceKey(),
    secret_key: String(process.env.SEATSIO_SECRET_KEY || "").trim(),
    chart_key: chartKey,
    event_key: event.seatsio_event_key || null,
    seating_mode: normalizeSeatingMode(event.seating_mode)
  };
}

async function saveOrganizerSeatingConfig(eventId, organizerId, payload) {
  if (!isSeatsioConfigured()) {
    throw new ApiError(503, "Seats.io is not configured.");
  }
  try {
    let event = await assertOrganizerOwnsEvent(eventId, organizerId);
    const seatingMode = normalizeSeatingMode(payload.seating_mode || "reserved");
    const chartKey = payload.chart_key || event.seatsio_chart_key || (await ensureChartForEvent(event));

    let eventKey = event.seatsio_event_key;
    if (seatingMode === "reserved") {
      eventKey = await ensureSeatsioEventForPlatformEvent({
        ...event,
        seatsio_chart_key: chartKey
      });
    }

    await updateEventSeatingKeys(eventId, {
      seating_mode: seatingMode,
      seatsio_chart_key: chartKey,
      seatsio_event_key: seatingMode === "reserved" ? eventKey : event.seatsio_event_key
    });

    event = await findEventById(eventId);
    return {
      event_id: Number(eventId),
      seating_mode: normalizeSeatingMode(event.seating_mode),
      chart_key: event.seatsio_chart_key,
      event_key: event.seatsio_event_key
    };
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throwSeatsioError(err, "Could not save seating chart.");
  }
}

async function getPublicSeatingChart(eventId) {
  if (!isSeatsioConfigured()) {
    throw new ApiError(503, "Reserved seating is not available.");
  }
  const event = await findEventById(eventId);
  if (!event || event.status !== "approved") {
    throw new ApiError(404, "Event not found");
  }
  if (!isReservedSeating(event)) {
    throw new ApiError(400, "This event does not use reserved seating.");
  }
  if (!event.seatsio_event_key) {
    throw new ApiError(404, "Seating chart not configured for this event.");
  }
  return {
    event_id: Number(eventId),
    workspace_key: getWorkspaceKey(),
    region: publicRegion(),
    event_key: event.seatsio_event_key,
    chart_key: event.seatsio_chart_key,
    pricing: buildPricingFromTicketLevels(event.ticket_levels || []),
    max_selected_objects: 20
  };
}

async function bookSeatsForCheckout({ event, holdToken, selectedSeats, bookingId }) {
  if (!isReservedSeating(event) || !event.seatsio_event_key) {
    return null;
  }
  if (!holdToken) {
    throw new ApiError(400, "Seat hold expired. Please select seats again.");
  }
  const labels = (selectedSeats || []).map((seat) => seat.label).filter(Boolean);
  if (!labels.length) {
    throw new ApiError(400, "Select at least one seat.");
  }
  const client = getClient();
  await client.events.book(
    event.seatsio_event_key,
    labels,
    holdToken,
    bookingId != null ? String(bookingId) : null
  );
  return { booked_labels: labels };
}

async function releaseSeatHold({ eventKey, holdToken, labels }) {
  if (!holdToken || !eventKey || !labels?.length || !isSeatsioConfigured()) {
    return { released: false };
  }
  try {
    const client = getClient();
    await client.events.release(eventKey, labels, holdToken);
    return { released: true };
  } catch (_err) {
    return { released: false };
  }
}

module.exports = {
  isSeatsioConfigured,
  getWorkspaceKey,
  publicRegion,
  buildPricingFromTicketLevels,
  buildCartFromSelectedSeats: buildCartFromSelectedSeatsForBooking,
  getOrganizerDesignerConfig,
  saveOrganizerSeatingConfig,
  getPublicSeatingChart,
  bookSeatsForCheckout,
  releaseSeatHold,
  ensureSeatsioEventForPlatformEvent
};
