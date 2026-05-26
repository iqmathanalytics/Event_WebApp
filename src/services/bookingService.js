const ApiError = require("../utils/ApiError");
const { pool } = require("../config/db");
const { findEventById } = require("../models/eventModel");
const { findUserById } = require("../models/userModel");
const { getEventAvailableDates, normalizeDateList } = require("../utils/eventSchedule");
const { requiresStripePayment } = require("../utils/money");
const couponService = require("./couponService");
const {
  createBooking,
  listBookingsByOrganizer,
  listBookingsForAdmin,
  listBookingsByUser,
  countReservedSeatsForEvent
} = require("../models/bookingModel");
const { assertSeatsAvailableForBooking } = require("../utils/eventSeats");
const {
  resolveBookingCart,
  computeCartSubtotal
} = require("../utils/eventTicketLevels");
const { sendTransactionalEmail } = require("../utils/emailIntegrations");
const {
  buildBookingConfirmationEmail,
  ticketBlocksFromCart
} = require("../utils/transactionalEmailTemplates");

function amountPaidForExport(row) {
  if (row.amount_paid_cents != null && row.amount_paid_cents !== "") {
    return Number((Number(row.amount_paid_cents) / 100).toFixed(2));
  }
  return row.total_amount ?? "";
}

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
    "Subtotal",
    "Discount",
    "Coupon Code",
    "Total Amount",
    "Payment Status",
    "Amount Paid",
    "Currency",
    "Paid At",
    "Stripe Payment Intent",
    "Stripe Charge"
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
      row.subtotal_amount ?? row.total_amount ?? "",
      row.discount_amount ?? 0,
      row.coupon_code || "",
      row.total_amount || 0,
      row.payment_status || "paid",
      amountPaidForExport(row),
      row.currency || "usd",
      row.paid_at || "",
      row.stripe_payment_intent_id || "",
      row.stripe_charge_id || ""
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

function parseTicketItemsJson(value) {
  if (!value) {
    return [];
  }
  let parsed = value;
  if (typeof value === "string") {
    try {
      parsed = JSON.parse(value);
    } catch (_err) {
      return [];
    }
  }
  if (!Array.isArray(parsed)) {
    return [];
  }
  return parsed
    .map((row) => ({
      level_id: String(row?.level_id || row?.levelId || "").trim(),
      level_name: String(row?.level_name || row?.levelName || "Ticket").trim(),
      unit_price: Number(row?.unit_price ?? row?.unitPrice) || 0,
      quantity: Math.max(0, Number(row?.quantity) || 0)
    }))
    .filter((row) => row.quantity > 0);
}

function mapBookingRow(row) {
  const ticket_items = parseTicketItemsJson(row.ticket_items_json);
  return {
    ...row,
    selected_dates: parseSelectedDates(row.selected_dates_json),
    ticket_items: ticket_items.length
      ? ticket_items
      : Number(row.attendee_count) > 0
        ? [
            {
              level_id: "general",
              level_name: "General Admission",
              unit_price: Number(row.subtotal_amount || row.total_amount) / Math.max(1, Number(row.attendee_count)),
              quantity: Number(row.attendee_count)
            }
          ]
        : []
  };
}

/** Shared validation and pricing for bookings and Stripe checkout. */
async function resolveEventBookingPricing({ userId, payload }) {
  const event = await findEventById(payload.event_id);
  if (!event || event.status !== "approved") {
    throw new ApiError(404, "Event not found");
  }

  const ticketSalesMode = event.ticket_sales_mode || "external";
  if (ticketSalesMode !== "platform") {
    throw new ApiError(
      400,
      "This event sells tickets through an external link. Use the organizer’s ticket page to reserve."
    );
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
  let cart;
  let guests;
  try {
    ({ cart, attendeeCount: guests } = resolveBookingCart(event, payload));
  } catch (err) {
    throw new ApiError(400, err.message || "Invalid ticket selection.");
  }
  const reservedSeats = await countReservedSeatsForEvent(payload.event_id, {
    excludeHoldToken: payload.coupon_hold_token || null
  });
  assertSeatsAvailableForBooking(event, guests, reservedSeats);

  let subtotalAmount = computeCartSubtotal(cart, totalDays);
  let discountAmount = 0;
  let totalAmount = subtotalAmount;
  let couponId = null;
  let couponCode = null;
  const holdToken = payload.coupon_hold_token || null;

  if (holdToken) {
    const applied = await couponService.consumeHoldForBooking({
      userId,
      holdToken,
      eventId: payload.event_id,
      attendeeCount: guests,
      selectedDates
    });
    subtotalAmount = applied.subtotal;
    discountAmount = applied.discount;
    totalAmount = applied.total;
    couponId = applied.coupon.id;
    couponCode = applied.coupon.code;
    selectedDates = applied.selectedDates;
  }

  return {
    event,
    user,
    organizerId: event.organizer_id,
    userName: user.name,
    userEmail: user.email,
    userPhone: user.mobile_number || "",
    selectedDates,
    bookingDate,
    totalDays,
    attendeeCount: guests,
    ticketCart: cart,
    subtotalAmount,
    discountAmount,
    totalAmount,
    couponId,
    couponCode,
    holdToken
  };
}

async function dispatchBookingConfirmationEmail({ bookingId, payload, pricing, paymentStatus }) {
  const event = pricing.event;
  const recipient = String(
    payload.email?.trim() || pricing.userEmail || pricing.user?.email || ""
  ).trim();
  if (!recipient || !bookingId || !event) {
    return;
  }

  const mail = buildBookingConfirmationEmail({
    guestName: payload.name?.trim() || pricing.userName,
    eventTitle: event.title,
    event,
    bookingId,
    selectedDates: pricing.selectedDates,
    totalDays: pricing.totalDays,
    attendeeCount: pricing.attendeeCount,
    ticketBlocks: ticketBlocksFromCart(pricing.ticketCart, pricing.totalDays),
    subtotalAmount: pricing.subtotalAmount,
    discountAmount: pricing.discountAmount,
    totalAmount: pricing.totalAmount,
    couponCode: pricing.couponCode,
    paymentStatus: paymentStatus || "paid"
  });

  await sendTransactionalEmail({
    to: recipient,
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  }).catch(() => {});
}

async function insertBookingFromPricing({ userId, payload, pricing, paymentMeta }) {
  const user = pricing.user;
  const holdToken = pricing.holdToken;
  const payment_status = paymentMeta?.payment_status || "paid";
  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const bookingId = await createBooking(
      {
        event_id: payload.event_id,
        organizer_id: pricing.organizerId,
        user_id: userId,
        name: payload.name?.trim() || user.name,
        email: payload.email?.trim() || user.email,
        phone: (() => {
          const p = String(payload.phone || "").trim();
          if (p.length < 8) {
            const ApiError = require("../utils/ApiError");
            throw new ApiError(400, "Phone number is required for booking.");
          }
          return p;
        })(),
        attendee_count: pricing.attendeeCount,
        ticket_items_json: pricing.ticketCart?.length
          ? JSON.stringify(pricing.ticketCart)
          : null,
        booking_date: pricing.bookingDate,
        selected_dates_json: JSON.stringify(pricing.selectedDates),
        total_days: pricing.totalDays,
        total_amount: pricing.totalAmount,
        coupon_id: pricing.couponId,
        subtotal_amount: pricing.subtotalAmount,
        discount_amount: pricing.discountAmount,
        coupon_code: pricing.couponCode,
        payment_status,
        stripe_payment_intent_id: paymentMeta?.stripe_payment_intent_id || null,
        stripe_charge_id: paymentMeta?.stripe_charge_id || null,
        amount_paid_cents: paymentMeta?.amount_paid_cents ?? null,
        currency: paymentMeta?.currency || "usd",
        paid_at: paymentMeta?.paid_at || new Date()
      },
      conn
    );

    if (holdToken && pricing.couponId) {
      await couponService.finalizeCouponRedemption(
        { couponId: pricing.couponId, userId, bookingId, holdToken },
        conn
      );
    }

    await conn.commit();

    await dispatchBookingConfirmationEmail({
      bookingId,
      payload,
      pricing,
      paymentStatus: payment_status
    }).catch(() => {});

    return {
      bookingId,
      selectedDates: pricing.selectedDates,
      totalDays: pricing.totalDays,
      subtotalAmount: pricing.subtotalAmount,
      discountAmount: pricing.discountAmount,
      totalAmount: pricing.totalAmount,
      couponCode: pricing.couponCode,
      paymentStatus: payment_status
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Free or sub-minimum bookings (no Stripe). */
async function createEventBooking({ userId, payload }) {
  const pricing = await resolveEventBookingPricing({ userId, payload });

  if (requiresStripePayment(pricing.totalAmount)) {
    throw new ApiError(
      400,
      "This booking requires card payment. Use the payment checkout flow."
    );
  }

  const payment_status = pricing.totalAmount <= 0 ? "free" : "free";
  return insertBookingFromPricing({
    userId,
    payload,
    pricing,
    paymentMeta: {
      payment_status,
      amount_paid_cents: 0,
      paid_at: new Date()
    }
  });
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
  resolveEventBookingPricing,
  dispatchBookingConfirmationEmail,
  createEventBooking,
  fetchOrganizerBookings,
  fetchAdminBookings,
  fetchUserBookings,
  getOrganizerBookingsExport,
  getAdminBookingsExport
};
