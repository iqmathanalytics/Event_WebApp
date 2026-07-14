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
  return {
    booking_id: row.id,
    event_id: row.event_id,
    event_title: row.event_title,
    event_date: row.event_date,
    event_time: row.event_time,
    venue_name: row.venue_name,
    city_name: row.city_name,
    organizer_name: row.organizer_name,
    guest_name: row.name,
    guest_email: row.email,
    guest_phone: row.phone,
    attendee_count: row.attendee_count,
    ticket_items: parseTicketItemsJson(row.ticket_items_json),
    selected_dates: parseSelectedDatesJson(row.selected_dates_json),
    selected_seats: parseSelectedSeatsJson(row.selected_seats_json),
    selected_seats_label: formatSelectedSeatsLabel(parseSelectedSeatsJson(row.selected_seats_json)),
    total_amount: row.total_amount,
    payment_status: row.payment_status,
    booking_ref: `#${row.id}`,
    is_valid_ticket: isValidTicket,
    checked_in_at: row.checked_in_at,
    already_checked_in: Boolean(row.checked_in_at),
    is_guest_booking: row.is_guest_booking === 1 || row.user_id == null
  };
}

async function verifyBookingByCode(rawCode) {
  const code = normalizeCheckInCodeInput(rawCode);
  if (!code || code.length < 8) {
    throw new ApiError(400, "Invalid or missing ticket code.");
  }
  const row = await findBookingByCheckInCode(code);
  if (!row) {
    throw new ApiError(404, "No booking found for this QR code.");
  }
  const booking = mapVerifyBooking(row);
  if (!booking.is_valid_ticket) {
    throw new ApiError(400, "This booking is not confirmed for entry.");
  }
  return booking;
}

async function checkInBookingByCode({ rawCode, adminUserId }) {
  const code = normalizeCheckInCodeInput(rawCode);
  if (!code || code.length < 8) {
    throw new ApiError(400, "Invalid or missing ticket code.");
  }
  const row = await findBookingByCheckInCode(code);
  if (!row) {
    throw new ApiError(404, "No booking found for this QR code.");
  }
  const paymentStatus = String(row.payment_status || "").toLowerCase();
  if (paymentStatus !== "paid" && paymentStatus !== "free") {
    throw new ApiError(400, "This booking is not confirmed for entry.");
  }

  const wasAlreadyCheckedIn = Boolean(row.checked_in_at);
  await markBookingCheckedIn({ bookingId: row.id, adminUserId });
  const refreshed = await findBookingByCheckInCode(code);
  const booking = mapVerifyBooking(refreshed);
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
