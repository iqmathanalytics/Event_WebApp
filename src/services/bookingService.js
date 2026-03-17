const ApiError = require("../utils/ApiError");
const { findEventById } = require("../models/eventModel");
const { findUserById } = require("../models/userModel");
const { getEventAvailableDates, normalizeDateList } = require("../utils/eventSchedule");
const {
  createBooking,
  listBookingsByOrganizer,
  listBookingsForAdmin,
  listBookingsByUser
} = require("../models/bookingModel");

function toCsv(rows) {
  const headers = [
    "Event",
    "User",
    "Email",
    "Phone",
    "Attendee Count",
    "Selected Dates",
    "Booking Date",
    "Total Days",
    "Total Amount"
  ];
  const lines = [headers.join(",")];
  rows.forEach((row) => {
    const selectedDates = Array.isArray(row.selected_dates) ? row.selected_dates.join(" | ") : "";
    const values = [
      row.event_title || "",
      row.name || "",
      row.email || "",
      row.phone || "",
      row.attendee_count || 0,
      selectedDates,
      row.booking_date || "",
      row.total_days || 0,
      row.total_amount || 0
    ].map((value) => `"${String(value).replace(/"/g, '""')}"`);
    lines.push(values.join(","));
  });
  return lines.join("\n");
}

function parseSelectedDates(value) {
  if (!value) {
    return [];
  }
  try {
    const parsed = JSON.parse(value);
    return normalizeDateList(Array.isArray(parsed) ? parsed : []);
  } catch (_err) {
    return normalizeDateList(String(value).split(",").map((item) => item.trim()));
  }
}

function mapBookingRow(row) {
  return {
    ...row,
    selected_dates: parseSelectedDates(row.selected_dates_json)
  };
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

  const availableDates = getEventAvailableDates(event);
  if (!availableDates.length) {
    throw new ApiError(400, "This event has no available booking dates.");
  }

  let selectedDates = normalizeDateList(payload.selected_dates || []);
  if (!selectedDates.length) {
    const fallbackDate = payload.booking_date || availableDates[0];
    selectedDates = normalizeDateList([fallbackDate]);
  }
  const invalidDate = selectedDates.find((date) => !availableDates.includes(date));
  if (invalidDate) {
    throw new ApiError(400, `Selected date ${invalidDate} is not available for this event.`);
  }

  const bookingDate = selectedDates[0];
  const totalDays = selectedDates.length;
  const guests = Number(payload.attendee_count);
  const pricePerDay = Number(event.price || 0);
  const totalAmount = Number((pricePerDay * totalDays * guests).toFixed(2));

  const bookingId = await createBooking({
    event_id: payload.event_id,
    organizer_id: event.organizer_id,
    user_id: userId,
    name: payload.name?.trim() || user.name,
    email: payload.email?.trim() || user.email,
    phone: payload.phone?.trim() || user.mobile_number || "",
    attendee_count: payload.attendee_count,
    booking_date: bookingDate,
    selected_dates_json: JSON.stringify(selectedDates),
    total_days: totalDays,
    total_amount: totalAmount
  });

  return { bookingId, selectedDates, totalDays, totalAmount };
}

async function fetchOrganizerBookings({ organizerId, query }) {
  const rows = await listBookingsByOrganizer({
    organizerId,
    eventId: query.event_id ? Number(query.event_id) : null,
    date: query.date || null
  });
  return rows.map(mapBookingRow);
}

async function fetchAdminBookings(query) {
  const rows = await listBookingsForAdmin({
    eventId: query.event_id ? Number(query.event_id) : null,
    organizerId: query.organizer_id ? Number(query.organizer_id) : null,
    cityId: query.city ? Number(query.city) : null,
    date: query.date || null
  });
  return rows.map(mapBookingRow);
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
  const rows = await listBookingsByUser({ userId });
  return rows.map(mapBookingRow);
}

module.exports = {
  createEventBooking,
  fetchOrganizerBookings,
  fetchAdminBookings,
  fetchUserBookings,
  getOrganizerBookingsExport,
  getAdminBookingsExport
};
