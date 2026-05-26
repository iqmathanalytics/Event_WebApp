const { countReservedSeatsForEvent } = require("../models/bookingModel");

const MAX_SEATS_PER_EVENT = 50000;

function parseTotalSeats(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return Math.min(MAX_SEATS_PER_EVENT, Math.floor(n));
}

function requiresTotalSeats(ticketSalesMode) {
  return String(ticketSalesMode || "").trim() === "platform";
}

/**
 * @param {object} event
 * @returns {{ total_seats: number|null, booked_seats: number, seats_remaining: number|null, seats_sold_out: boolean }}
 */
function buildSeatAvailability(event, reservedSeats) {
  const total = parseTotalSeats(event?.total_seats);
  const booked = Math.max(0, Number(reservedSeats) || 0);
  if (!total) {
    return {
      total_seats: null,
      booked_seats: booked,
      seats_remaining: null,
      seats_sold_out: false
    };
  }
  const remaining = Math.max(0, total - booked);
  return {
    total_seats: total,
    booked_seats: booked,
    seats_remaining: remaining,
    seats_sold_out: remaining <= 0
  };
}

async function attachEventSeatAvailability(event, options = {}) {
  if (!event) {
    return event;
  }
  const reserved = await countReservedSeatsForEvent(event.id, options);
  return {
    ...event,
    ...buildSeatAvailability(event, reserved)
  };
}

const ApiError = require("./ApiError");

function assertSeatsAvailableForBooking(event, requestedSeats, reservedSeats) {
  const total = parseTotalSeats(event?.total_seats);
  if (!requiresTotalSeats(event?.ticket_sales_mode) || !total) {
    return;
  }
  const guests = Number(requestedSeats);
  if (!Number.isFinite(guests) || guests < 1) {
    return;
  }
  const reserved = Math.max(0, Number(reservedSeats) || 0);
  const remaining = total - reserved;
  if (guests > remaining) {
    throw new ApiError(
      400,
      remaining <= 0
        ? "This event is sold out. No seats are available."
        : `Only ${remaining} seat${remaining === 1 ? "" : "s"} left for this event.`
    );
  }
}

module.exports = {
  MAX_SEATS_PER_EVENT,
  parseTotalSeats,
  requiresTotalSeats,
  buildSeatAvailability,
  attachEventSeatAvailability,
  assertSeatsAvailableForBooking
};
