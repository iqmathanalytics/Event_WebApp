import { normalizeEventTicketSalesMode } from "./eventTicketSalesMode";

export function parseTotalSeats(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) {
    return null;
  }
  return Math.floor(n);
}

export function getEventSeatStats(event) {
  const total = parseTotalSeats(event?.total_seats);
  const booked = Math.max(0, Number(event?.booked_seats) || 0);
  const remaining =
    event?.seats_remaining != null && Number.isFinite(Number(event.seats_remaining))
      ? Math.max(0, Number(event.seats_remaining))
      : total != null
        ? Math.max(0, total - booked)
        : null;
  const soldOut = Boolean(event?.seats_sold_out) || (remaining != null && remaining <= 0);
  const fillPercent =
    total && total > 0 ? Math.min(100, Math.max(0, Math.round((booked / total) * 100))) : 0;

  return {
    total,
    booked,
    remaining,
    soldOut,
    fillPercent,
    hasCapacity: total != null && total > 0
  };
}

export function isPlatformTicketEvent(event) {
  return normalizeEventTicketSalesMode(event?.ticket_sales_mode) === "platform";
}

export function maxTicketsForBooking(event, defaultMax = 50) {
  const stats = getEventSeatStats(event);
  if (!stats.hasCapacity) {
    return defaultMax;
  }
  if (stats.soldOut) {
    return 0;
  }
  return Math.min(defaultMax, stats.remaining);
}
