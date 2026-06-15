const { pool } = require("../config/db");
const { generateCheckInCode } = require("../utils/bookingCheckIn");
const { toJsonDbString } = require("../utils/jsonDb");

async function createBooking(payload, conn) {
  const runner = conn || pool;
  const {
    event_id,
    organizer_id,
    user_id,
    name,
    email,
    phone,
    attendee_count,
    ticket_items_json,
    booking_date,
    selected_dates_json,
    total_days,
    total_amount,
    coupon_id,
    subtotal_amount,
    discount_amount,
    coupon_code,
    payment_status,
    stripe_payment_intent_id,
    stripe_charge_id,
    amount_paid_cents,
    currency,
    paid_at,
    is_guest_booking,
    check_in_code,
    seatsio_hold_token,
    selected_seats_json
  } = payload;

  const subtotal = subtotal_amount != null ? subtotal_amount : total_amount;
  const discount = discount_amount != null ? discount_amount : 0;
  const payStatus = payment_status || "paid";
  const paidAt = paid_at || (payStatus === "paid" || payStatus === "free" ? new Date() : null);
  const checkInCode = check_in_code || generateCheckInCode();

  const [result] = await runner.query(
    `INSERT INTO event_bookings
      (event_id, organizer_id, user_id, is_guest_booking, name, email, phone, attendee_count, ticket_items_json, booking_date, selected_dates_json, total_days, total_amount, coupon_id, subtotal_amount, discount_amount, coupon_code, payment_status, stripe_payment_intent_id, stripe_charge_id, amount_paid_cents, currency, paid_at, check_in_code, seatsio_hold_token, selected_seats_json, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS JSON), NOW())`,
    [
      event_id,
      organizer_id,
      user_id ?? null,
      is_guest_booking ? 1 : 0,
      name,
      email,
      phone,
      attendee_count,
      ticket_items_json || null,
      booking_date,
      selected_dates_json,
      total_days,
      total_amount,
      coupon_id || null,
      subtotal,
      discount,
      coupon_code || null,
      payStatus,
      stripe_payment_intent_id || null,
      stripe_charge_id || null,
      amount_paid_cents ?? null,
      currency || "usd",
      paidAt,
      checkInCode,
      seatsio_hold_token || null,
      selected_seats_json ? toJsonDbString(selected_seats_json) : null
    ]
  );

  return { id: result.insertId, check_in_code: checkInCode };
}

async function findBookingById(bookingId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT eb.*,
            e.title AS event_title,
            e.public_slug AS event_public_slug,
            e.event_date,
            e.event_time,
            COALESCE(e.venue_name, e.venue) AS venue_name,
            c.name AS city_name
     FROM event_bookings eb
     INNER JOIN events e ON e.id = eb.event_id
     LEFT JOIN cities c ON c.id = e.city_id
     WHERE eb.id = ?
     LIMIT 1`,
    [bookingId]
  );
  return rows[0] || null;
}

async function findBookingByCheckInCode(checkInCode, conn) {
  const runner = conn || pool;
  const code = String(checkInCode || "").trim();
  if (!code) {
    return null;
  }
  const [rows] = await runner.query(
    `SELECT eb.*,
            e.title AS event_title,
            e.public_slug AS event_public_slug,
            e.event_date,
            e.event_time,
            COALESCE(e.venue_name, e.venue) AS venue_name,
            c.name AS city_name,
            org.name AS organizer_name
     FROM event_bookings eb
     INNER JOIN events e ON e.id = eb.event_id
     LEFT JOIN cities c ON c.id = e.city_id
     LEFT JOIN users org ON org.id = eb.organizer_id
     WHERE eb.check_in_code = ?
     LIMIT 1`,
    [code]
  );
  return rows[0] || null;
}

async function markBookingCheckedIn({ bookingId, adminUserId }, conn) {
  const runner = conn || pool;
  await runner.query(
    `UPDATE event_bookings
     SET checked_in_at = COALESCE(checked_in_at, NOW()),
         checked_in_by = COALESCE(checked_in_by, ?)
     WHERE id = ?`,
    [adminUserId, bookingId]
  );
}

async function findBookingByPaymentIntentId(paymentIntentId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT id, payment_status, stripe_payment_intent_id, total_amount, amount_paid_cents
     FROM event_bookings
     WHERE stripe_payment_intent_id = ?
     LIMIT 1`,
    [paymentIntentId]
  );
  return rows[0] || null;
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
            eb.is_guest_booking,
            eb.name,
            eb.email,
            eb.phone,
            eb.attendee_count,
            eb.booking_date,
            eb.selected_dates_json,
            eb.total_days,
            eb.total_amount,
            eb.subtotal_amount,
            eb.discount_amount,
            eb.coupon_code,
            eb.payment_status,
            eb.amount_paid_cents,
            eb.currency,
            eb.paid_at,
            eb.stripe_payment_intent_id,
            eb.stripe_charge_id,
            eb.check_in_code,
            eb.checked_in_at,
            eb.checked_in_by,
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
            eb.is_guest_booking,
            eb.name,
            eb.email,
            eb.phone,
            eb.attendee_count,
            eb.booking_date,
            eb.selected_dates_json,
            eb.total_days,
            eb.total_amount,
            eb.subtotal_amount,
            eb.discount_amount,
            eb.coupon_code,
            eb.payment_status,
            eb.amount_paid_cents,
            eb.currency,
            eb.paid_at,
            eb.stripe_payment_intent_id,
            eb.stripe_charge_id,
            eb.check_in_code,
            eb.checked_in_at,
            eb.checked_in_by,
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
            e.public_slug AS event_public_slug,
            e.image_url AS event_image,
            e.event_date,
            e.event_time,
            COALESCE(e.venue_name, e.venue) AS venue_name,
            e.venue_address,
            c.name AS city,
            e.price,
            eb.attendee_count,
            eb.ticket_items_json,
            eb.booking_date,
            eb.selected_dates_json,
            eb.total_days,
            eb.total_amount,
            eb.subtotal_amount,
            eb.discount_amount,
            eb.coupon_code,
            eb.payment_status,
            eb.amount_paid_cents,
            eb.paid_at,
            eb.check_in_code,
            eb.checked_in_at,
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

function parseTicketItemsFromBookingRow(row) {
  const raw = row?.ticket_items_json;
  if (!raw) {
    return [];
  }
  let parsed = raw;
  if (typeof raw === "string") {
    try {
      parsed = JSON.parse(raw);
    } catch (_err) {
      return [];
    }
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .map((item) => ({
      level_id: String(item?.level_id || item?.levelId || "").trim(),
      quantity: Math.max(0, Number(item?.quantity) || 0)
    }))
    .filter((item) => item.level_id && item.quantity > 0);
}

/**
 * Tickets sold per level_id (paid, free, and pending bookings).
 * @returns {Promise<Map<string, number>>}
 */
async function countBookedTicketsByLevelForEvent(eventId) {
  const [rows] = await pool.query(
    `SELECT ticket_items_json, attendee_count
     FROM event_bookings
     WHERE event_id = ?
       AND payment_status IN ('paid', 'free', 'pending')`,
    [eventId]
  );
  const map = new Map();
  for (const row of rows) {
    const items = parseTicketItemsFromBookingRow(row);
    if (items.length) {
      items.forEach((item) => {
        map.set(item.level_id, (map.get(item.level_id) || 0) + item.quantity);
      });
    }
  }
  return map;
}

/**
 * Seats counted against capacity: confirmed bookings + active coupon holds.
 */
async function countReservedSeatsForEvent(eventId, options = {}) {
  const { excludeHoldToken } = options;
  const [bookingRows] = await pool.query(
    `SELECT COALESCE(SUM(attendee_count), 0) AS seats
     FROM event_bookings
     WHERE event_id = ?
       AND payment_status IN ('paid', 'free', 'pending')`,
    [eventId]
  );
  let heldSeats = 0;
  try {
    const holdParams = [eventId];
    let holdSql = `SELECT COALESCE(SUM(attendee_count), 0) AS seats
       FROM event_coupon_holds
       WHERE event_id = ? AND expires_at >= NOW()`;
    if (excludeHoldToken) {
      holdSql += " AND hold_token <> ?";
      holdParams.push(excludeHoldToken);
    }
    const [holdRows] = await pool.query(holdSql, holdParams);
    heldSeats = Number(holdRows[0]?.seats || 0);
  } catch (err) {
    if (err?.code !== "ER_NO_SUCH_TABLE") {
      throw err;
    }
  }
  return Number(bookingRows[0]?.seats || 0) + heldSeats;
}

module.exports = {
  createBooking,
  findBookingById,
  findBookingByCheckInCode,
  markBookingCheckedIn,
  findBookingByPaymentIntentId,
  listBookingsByOrganizer,
  listBookingsForAdmin,
  listBookingsByUser,
  countReservedSeatsForEvent,
  countBookedTicketsByLevelForEvent
};
