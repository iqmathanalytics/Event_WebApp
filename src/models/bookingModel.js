const { pool } = require("../config/db");

async function createBooking(payload) {
  const {
    event_id,
    organizer_id,
    user_id,
    name,
    email,
    phone,
    attendee_count,
    booking_date
  } = payload;

  const [result] = await pool.query(
    `INSERT INTO event_bookings
      (event_id, organizer_id, user_id, name, email, phone, attendee_count, booking_date, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
    [event_id, organizer_id, user_id, name, email, phone, attendee_count, booking_date]
  );

  return result.insertId;
}

async function listBookingsByOrganizer({ organizerId, eventId, date }) {
  const conditions = ["eb.organizer_id = ?"];
  const values = [organizerId];

  if (eventId) {
    conditions.push("eb.event_id = ?");
    values.push(eventId);
  }
  if (date) {
    conditions.push("eb.booking_date = ?");
    values.push(date);
  }

  const [rows] = await pool.query(
    `SELECT eb.id,
            eb.event_id,
            eb.user_id,
            eb.name,
            eb.email,
            eb.phone,
            eb.attendee_count,
            eb.booking_date,
            eb.created_at,
            e.title AS event_title,
            e.city_id,
            c.name AS city_name
     FROM event_bookings eb
     INNER JOIN events e ON e.id = eb.event_id
     LEFT JOIN cities c ON c.id = e.city_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY eb.created_at DESC`,
    values
  );

  return rows;
}

async function listBookingsForAdmin({ eventId, organizerId, cityId, date }) {
  const conditions = ["1=1"];
  const values = [];

  if (eventId) {
    conditions.push("eb.event_id = ?");
    values.push(eventId);
  }
  if (organizerId) {
    conditions.push("eb.organizer_id = ?");
    values.push(organizerId);
  }
  if (cityId) {
    conditions.push("e.city_id = ?");
    values.push(cityId);
  }
  if (date) {
    conditions.push("eb.booking_date = ?");
    values.push(date);
  }

  const [rows] = await pool.query(
    `SELECT eb.id,
            eb.event_id,
            eb.organizer_id,
            eb.user_id,
            eb.name,
            eb.email,
            eb.phone,
            eb.attendee_count,
            eb.booking_date,
            eb.created_at,
            e.title AS event_title,
            e.city_id,
            c.name AS city_name,
            org.name AS organizer_name
     FROM event_bookings eb
     INNER JOIN events e ON e.id = eb.event_id
     LEFT JOIN cities c ON c.id = e.city_id
     LEFT JOIN users org ON org.id = eb.organizer_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY eb.created_at DESC`,
    values
  );

  return rows;
}

async function listBookingsByUser({ userId }) {
  const [rows] = await pool.query(
    `SELECT eb.id AS booking_id,
            eb.event_id,
            e.title AS event_title,
            e.image_url AS event_image,
            e.event_date,
            e.event_time,
            COALESCE(e.venue_name, e.venue) AS venue_name,
            e.venue_address,
            c.name AS city,
            e.price,
            eb.attendee_count,
            eb.booking_date,
            org.name AS organizer_name,
            e.google_maps_link
     FROM event_bookings eb
     INNER JOIN events e ON e.id = eb.event_id
     LEFT JOIN cities c ON c.id = e.city_id
     LEFT JOIN users org ON org.id = e.organizer_id
     WHERE eb.user_id = ?
     ORDER BY eb.created_at DESC`,
    [userId]
  );
  return rows;
}

module.exports = {
  createBooking,
  listBookingsByOrganizer,
  listBookingsForAdmin,
  listBookingsByUser
};
