const { SeatsioClient, Region } = require("seatsio");
const ApiError = require("../utils/ApiError");
const { findEventById } = require("../models/eventModel");
const { pool } = require("../config/db");
const { isReservedSeating, normalizeSeatingMode } = require("../utils/seatingMode");
const { normalizeTicketLevelsInput, isTicketLevelSaleActive } = require("../utils/eventTicketLevels");
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

const SEATSIO_HOLD_MINUTES = 15;

let cachedWorkspacePublicKey = null;

function getWorkspaceKey() {
  return String(process.env.SEATSIO_WORKSPACE_KEY || "").trim();
}

async function resolveWorkspacePublicKey(client) {
  if (cachedWorkspacePublicKey) {
    return cachedWorkspacePublicKey;
  }

  const configured = getWorkspaceKey();
  if (configured) {
    try {
      const workspace = await client.workspaces.retrieve(configured);
      if (workspace?.key) {
        cachedWorkspacePublicKey = workspace.key;
        return workspace.key;
      }
    } catch (_err) {
      /* configured public key may not match the secret workspace */
    }
  }

  const probe = await client.holdTokens.create(SEATSIO_HOLD_MINUTES);
  if (probe?.workspaceKey) {
    cachedWorkspacePublicKey = probe.workspaceKey;
    return probe.workspaceKey;
  }

  if (configured) {
    return configured;
  }

  throw new ApiError(
    503,
    "Seats.io workspace is misconfigured. Check SEATSIO_SECRET_KEY and SEATSIO_WORKSPACE_KEY."
  );
}

async function createBuyerHoldSession(client) {
  const token = await client.holdTokens.create(SEATSIO_HOLD_MINUTES);
  const workspaceKey = token?.workspaceKey || (await resolveWorkspacePublicKey(client));
  if (!token?.holdToken) {
    throw new ApiError(502, "Could not start a seat selection session.");
  }
  try {
    await client.holdTokens.expiresInMinutes(token.holdToken, SEATSIO_HOLD_MINUTES);
  } catch (_err) {
    /* non-fatal */
  }
  return {
    hold_token: token.holdToken,
    workspace_key: workspaceKey,
    hold_expires_at: token.expiresAt || null
  };
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

function buildSeatsioEventKey(eventId, chartKey) {
  const env = process.env.NODE_ENV === "production" ? "p" : "d";
  const chartPart = String(chartKey || "")
    .replace(/-/g, "")
    .slice(0, 12);
  return `bmt-${env}-e${eventId}-${chartPart}`;
}

function buildLegacySeatsioEventKey(eventId) {
  return `bmt-event-${eventId}`;
}

async function retrieveSeatsioEvent(client, eventKey) {
  if (!eventKey) {
    return null;
  }
  try {
    return await client.events.retrieve(eventKey);
  } catch (err) {
    const code = seatsioErrorCode(err);
    if (code === "EVENT_NOT_FOUND" || err?.status === 404) {
      return null;
    }
    throwSeatsioError(err, "Could not load seating event.");
  }
}

/**
 * A Seats.io event is permanently tied to one chart. When the organizer creates or
 * switches charts, we must create/link an event for the current chart_key — not reuse
 * an old event key that still points at a previous layout (e.g. from local dev).
 */
async function syncSeatsioEventForChart(event, chartKey) {
  const client = getClient();
  const resolvedChartKey = chartKey || event.seatsio_chart_key;
  if (!resolvedChartKey) {
    throw new ApiError(400, "Seating chart not configured.");
  }

  await publishChartForEvent(client, resolvedChartKey);

  const expectedKey = buildSeatsioEventKey(event.id, resolvedChartKey);
  const candidateKeys = [
    expectedKey,
    event.seatsio_event_key,
    buildLegacySeatsioEventKey(event.id)
  ].filter(Boolean);
  const uniqueCandidates = [...new Set(candidateKeys)];

  for (const key of uniqueCandidates) {
    const seatsioEvent = await retrieveSeatsioEvent(client, key);
    if (seatsioEvent?.chartKey === resolvedChartKey) {
      if (event.seatsio_event_key !== key) {
        await updateEventSeatingKeys(event.id, { seatsio_event_key: key });
      }
      return key;
    }
  }

  try {
    const seatsioEvent = await client.events.create(resolvedChartKey, {
      key: expectedKey
    });
    const eventKey = seatsioEvent.key || expectedKey;
    await updateEventSeatingKeys(event.id, { seatsio_event_key: eventKey });
    return eventKey;
  } catch (err) {
    const code = seatsioErrorCode(err);
    if (code === "EVENT_KEY_ALREADY_EXISTS") {
      const existing = await retrieveSeatsioEvent(client, expectedKey);
      if (existing?.chartKey === resolvedChartKey) {
        await updateEventSeatingKeys(event.id, { seatsio_event_key: expectedKey });
        return expectedKey;
      }
    }
    throwSeatsioError(err, "Could not link seating chart to this event.");
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
  const chartKey = event.seatsio_chart_key || (await ensureChartForEvent(event));
  const eventKey = await syncSeatsioEventForChart(
    { ...event, seatsio_chart_key: chartKey },
    chartKey
  );
  await updateEventSeatingKeys(event.id, {
    seatsio_event_key: eventKey,
    seating_mode: "reserved"
  });
  return eventKey;
}

function sortChartCategories(chartCategories = []) {
  return [...chartCategories].sort((a, b) => Number(a.key) - Number(b.key));
}

function buildPricingFromTicketLevels(ticketLevels = [], chartCategories = []) {
  const levels = normalizeTicketLevelsInput(ticketLevels);
  const categories = sortChartCategories(chartCategories);
  return levels
    .map((level, index) => ({
      level,
      category: categories[index]?.key ?? index + 1,
      price: Number(level.price) || 0,
      label: level.name
    }))
    .filter((row) => isTicketLevelSaleActive(row.level))
    .map(({ category, price, label }) => ({ category, price, label }));
}

function buildBlockedCategoryKeys(ticketLevels = [], chartCategories = []) {
  const levels = normalizeTicketLevelsInput(ticketLevels);
  const categories = sortChartCategories(chartCategories);
  const blocked = [];
  levels.forEach((level, index) => {
    if (!isTicketLevelSaleActive(level)) {
      const key = categories[index]?.key;
      if (key != null) {
        blocked.push(key);
      }
    }
  });
  return blocked;
}

async function listChartCategories(client, chartKey) {
  if (!chartKey) {
    return [];
  }
  try {
    const categories = await client.charts.listCategories(chartKey);
    return sortChartCategories(categories);
  } catch (_err) {
    return [];
  }
}

async function getBuyerSeatingSession(eventId, reuseHoldToken = null) {
  return getPublicSeatingChart(eventId, { prepareHold: true, reuseHoldToken });
}

function buildCartFromSelectedSeatsForBooking(
  selectedSeats = [],
  ticketLevels = [],
  totalDays = 1,
  chartCategoryKeys = [],
  chartPricing = []
) {
  const levels = normalizeTicketLevelsInput(ticketLevels);
  return buildCartFromSelectedSeats(selectedSeats, levels, totalDays, chartCategoryKeys, chartPricing);
}

async function getChartSeatingMetaForEvent(event) {
  if (!event?.seatsio_chart_key || !isSeatsioConfigured()) {
    return { chartCategoryKeys: [], chartPricing: [] };
  }
  const client = getClient();
  const categories = await listChartCategories(client, event.seatsio_chart_key);
  const chartCategoryKeys = categories.map((row) => row.key);
  const chartPricing = buildPricingFromTicketLevels(event.ticket_levels || [], categories);
  return { chartCategoryKeys, chartPricing };
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
      eventKey = await syncSeatsioEventForChart(
        { ...event, seatsio_chart_key: chartKey },
        chartKey
      );
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

async function getPublicSeatingChart(eventId, { prepareHold = false, reuseHoldToken = null } = {}) {
  if (!isSeatsioConfigured()) {
    throw new ApiError(503, "Reserved seating is not available.");
  }
  let event = await findEventById(eventId);
  if (!event || event.status !== "approved") {
    throw new ApiError(404, "Event not found");
  }
  if (!isReservedSeating(event)) {
    throw new ApiError(400, "This event does not use reserved seating.");
  }
  if (!event.seatsio_chart_key && !event.seatsio_event_key) {
    throw new ApiError(404, "Seating chart not configured for this event.");
  }
  const eventKey = await syncSeatsioEventForChart(event, event.seatsio_chart_key);
  event = await findEventById(eventId);

  const client = getClient();
  const seatsioEvent = await retrieveSeatsioEvent(client, eventKey);
  if (!seatsioEvent) {
    throw new ApiError(
      404,
      "Seating chart is not ready yet. Ask the organizer to publish and save the chart again."
    );
  }

  const chartCategories = await listChartCategories(client, event.seatsio_chart_key);
  const chartCategoryKeys = chartCategories.map((row) => row.key);
  const blockedCategoryKeys = buildBlockedCategoryKeys(event.ticket_levels || [], chartCategories);
  const payload = {
    event_id: Number(eventId),
    workspace_key: await resolveWorkspacePublicKey(client),
    region: publicRegion(),
    event_key: eventKey,
    chart_key: event.seatsio_chart_key,
    chart_category_keys: chartCategoryKeys,
    blocked_category_keys: blockedCategoryKeys,
    pricing: buildPricingFromTicketLevels(event.ticket_levels || [], chartCategories),
    max_selected_objects: 20
  };

  if (prepareHold) {
    const reuseToken = String(reuseHoldToken || "").trim();
    if (reuseToken) {
      try {
        const tokenInfo = await client.holdTokens.retrieve(reuseToken);
        payload.hold_token = reuseToken;
        payload.hold_expires_at = tokenInfo?.expiresAt || null;
      } catch (_err) {
        throw new ApiError(400, "Seat hold session expired. Please select seats again.");
      }
    } else {
      const holdSession = await createBuyerHoldSession(client);
      payload.hold_token = holdSession.hold_token;
      payload.workspace_key = holdSession.workspace_key;
      payload.hold_expires_at = holdSession.hold_expires_at;
    }
  }

  return payload;
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

/**
 * Book seats without an active hold (admin/backfill for already-paid bookings).
 */
async function bookSoldSeatsWithoutHold({ event, selectedSeats, bookingId }) {
  if (!isReservedSeating(event) || !event.seatsio_event_key) {
    return null;
  }
  const labels = (selectedSeats || []).map((seat) => seat.label).filter(Boolean);
  if (!labels.length) {
    throw new ApiError(400, "Select at least one seat.");
  }
  const client = getClient();
  await client.events.book(
    event.seatsio_event_key,
    labels,
    null,
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

async function syncSeatHoldSelection({ eventKey, holdToken, add = [], remove = [] }) {
  if (!isSeatsioConfigured()) {
    throw new ApiError(503, "Reserved seating is not available.");
  }
  if (!eventKey || !holdToken) {
    throw new ApiError(400, "Seat hold session expired. Please reopen the chart.");
  }

  const addLabels = (add || []).map((label) => String(label || "").trim()).filter(Boolean);
  const removeLabels = (remove || []).map((label) => String(label || "").trim()).filter(Boolean);
  if (!addLabels.length && !removeLabels.length) {
    return { held: [], released: [] };
  }

  const client = getClient();
  try {
    if (removeLabels.length) {
      await client.events.release(eventKey, removeLabels, holdToken);
    }
    if (addLabels.length) {
      await client.events.hold(eventKey, addLabels, holdToken);
    }
    return { held: addLabels, released: removeLabels };
  } catch (err) {
    if (err instanceof ApiError) {
      throw err;
    }
    throwSeatsioError(err, "Could not hold the selected seats.");
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
  getBuyerSeatingSession,
  bookSeatsForCheckout,
  bookSoldSeatsWithoutHold,
  releaseSeatHold,
  syncSeatHoldSelection,
  ensureSeatsioEventForPlatformEvent,
  getChartSeatingMetaForEvent
};
