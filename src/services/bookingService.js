const ApiError = require("../utils/ApiError");
const { findEventById } = require("../models/eventModel");
const { findUserById } = require("../models/userModel");
const {
  createBooking,
  listBookingsByOrganizer,
  listBookingsForAdmin,
  listBookingsByUser
} = require("../models/bookingModel");

function toCsv(rows) {
  const headers = ["Event", "User", "Email", "Phone", "Attendee Count", "Booking Date"];
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const values = [
      row.event_title || "",
      row.name || "",
      row.email || "",
      row.phone || "",
      row.attendee_count || 0,
      row.booking_date || ""
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`);
    lines.push(values.join(","));
  });
  return lines.join("\n");
}

async function createEventBooking({ userId, payload }) {
  const event = await findEventById(payload.event_id);
  if (!event || event.status !== "approved") {
    throw new ApiError(404, "Event not found");
  }

  const user = await findUserById(userId);
  if (!user || !user.is_active) {
    throw new ApiError(403, "Active user account required");
  }

  const bookingDate = payload.booking_date || String(event.event_date).slice(0, 10);
  const bookingId = await createBooking({
    event_id: payload.event_id,
    organizer_id: event.organizer_id,
    user_id: userId,
    name: payload.name?.trim() || user.name,
    email: payload.email?.trim() || user.email,
    phone: payload.phone?.trim() || user.mobile_number || "",
    attendee_count: payload.attendee_count,
    booking_date: bookingDate
  });

  return { bookingId };
}

async function fetchOrganizerBookings({ organizerId, query }) {
  return listBookingsByOrganizer({
    organizerId,
    eventId: query.event_id ? Number(query.event_id) : null,
    date: query.date || null
  });
}

async function fetchAdminBookings(query) {
  return listBookingsForAdmin({
    eventId: query.event_id ? Number(query.event_id) : null,
    organizerId: query.organizer_id ? Number(query.organizer_id) : null,
    cityId: query.city ? Number(query.city) : null,
    date: query.date || null
  });
}

async function getOrganizerBookingsExport({ organizerId, query }) {
  const rows = await fetchOrganizerBookings({ organizerId, query });
  return {
    rows,
    csv: toCsv(rows)
  };
}

async function getAdminBookingsExport(query) {
  const rows = await fetchAdminBookings(query);
  return {
    rows,
    csv: toCsv(rows)
  };
}

async function fetchUserBookings({ userId }) {
  return listBookingsByUser({ userId });
}

module.exports = {
  createEventBooking,
  fetchOrganizerBookings,
  fetchAdminBookings,
  fetchUserBookings,
  getOrganizerBookingsExport,
  getAdminBookingsExport
};
