const ApiError = require("../utils/ApiError");
const {
  findBookingByCheckInCode,
  markBookingCheckedIn
} = require("../models/bookingModel");
const { normalizeCheckInCodeInput } = require("../utils/bookingCheckIn");
const { formatSelectedSeatsLabel, parseSelectedSeatsJson } = require("../utils/bookingSeats");

function parseTicketItemsJson(raw) {
  if (!raw) {
    return [];
  }
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function parseSelectedDatesJson(raw) {
  if (!raw) {
    return [];
  }
  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
  } catch {
    return [];
  }
}

function mapVerifyBooking(row) {
  if (!row) {
    return null;
  }
  const paymentStatus = String(row.payment_status || "").toLowerCase();
  const isValidTicket = paymentStatus === "paid" || paymentStatus === "free";
  const selectedSeats = parseSelectedSeatsJson(row.selected_seats_json);
  return {
    booking_id: row.id,
    event_id: row.event_id,
    event_title: row.event_title,
    event_date: row.event_date,
    event_time: row.event_time,
    venue_name: row.venue_name,
    city_name: row.city_name || null,
    organizer_name: row.organizer_name || null,
    guest_name: row.name,
    guest_email: row.email,
    guest_phone: row.phone,
    attendee_count: row.attendee_count,
    ticket_items: parseTicketItemsJson(row.ticket_items_json),
    selected_dates: parseSelectedDatesJson(row.selected_dates_json),
    selected_seats: selectedSeats,
    selected_seats_label: formatSelectedSeatsLabel(selectedSeats),
    total_amount: row.total_amount,
    payment_status: row.payment_status,
    booking_ref: `#${row.id}`,
    is_valid_ticket: isValidTicket,
    checked_in_at: row.checked_in_at,
    already_checked_in: Boolean(row.checked_in_at),
    is_guest_booking: row.is_guest_booking === 1 || row.user_id == null
  };
}

function assertValidEntryCode(rawCode) {
  const code = normalizeCheckInCodeInput(rawCode);
  if (!code || code.length < 8) {
    throw new ApiError(400, "Invalid or missing ticket code.");
  }
  return code;
}

async function loadValidBooking(rawCode) {
  const code = assertValidEntryCode(rawCode);
  const row = await findBookingByCheckInCode(code);
  if (!row) {
    throw new ApiError(404, "No booking found for this QR code.");
  }
  const booking = mapVerifyBooking(row);
  if (!booking.is_valid_ticket) {
    throw new ApiError(400, "This booking is not confirmed for entry.");
  }
  return { code, row, booking };
}

function assertActorCanAccessBooking(row, actor) {
  if (!actor?.type) {
    throw new ApiError(403, "Check-in authorization required.");
  }
  if (actor.type === "admin") {
    return;
  }
  const organizerId = Number(row.event_organizer_id || row.organizer_id || 0);
  const actorId = Number(actor.userId || 0);
  if (!organizerId || !actorId || organizerId !== actorId) {
    throw new ApiError(403, "You can only check in guests for your own events.");
  }
}

async function verifyBookingByCode(rawCode, actor = null) {
  const { row, booking } = await loadValidBooking(rawCode);
  assertActorCanAccessBooking(row, actor);
  return booking;
}

async function checkInBookingByCode({ rawCode, adminUserId = null, actor = null }) {
  const { row, booking } = await loadValidBooking(rawCode);
  assertActorCanAccessBooking(row, actor);
  const wasAlreadyCheckedIn = Boolean(row.checked_in_at);
  const checkedInBy = adminUserId || actor?.userId || null;

  if (!wasAlreadyCheckedIn) {
    await markBookingCheckedIn({
      bookingId: row.id,
      adminUserId: checkedInBy
    });
    const nowIso = new Date().toISOString();
    booking.checked_in_at = nowIso;
    booking.already_checked_in = true;
  }

  return {
    booking,
    checked_in_now: !wasAlreadyCheckedIn,
    message: wasAlreadyCheckedIn
      ? "Guest was already checked in."
      : "Guest checked in successfully."
  };
}

module.exports = {
  verifyBookingByCode,
  checkInBookingByCode
};
