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
const { attachTicketLevelAvailability } = require("../utils/eventTicketLevelAvailability");
const {
  resolveBookingCart,
  computeCartSubtotal
} = require("../utils/eventTicketLevels");
const { applyTransactionFee } = require("../utils/transactionFee");
const { ensureGuestUserAccount } = require("./guestAccountService");
const { publicBookingQrImageUrl } = require("../utils/bookingQr");
const { sendTransactionalEmail } = require("../utils/emailIntegrations");
const {
  buildBookingConfirmationEmail,
  buildOrganizerBookingNotificationEmail,
  buildWelcomeEmail,
  ticketBlocksFromCart
} = require("../utils/transactionalEmailTemplates");
const { isExclusiveDealEvent } = require("../utils/exclusiveDealEvent");

function amountPaidForExport(row) {
  if (row.amount_paid_cents != null && row.amount_paid_cents !== "") {
    return Number((Number(row.amount_paid_cents) / 100).toFixed(2));
  }
  return row.total_amount ?? "";
}

function toCsv(rows) {
  const headers = [
    "Event",
    "Guest",
    "User",
    "Email",
    "Phone",
    "Attendee Count",
    "Event Dates",
    "Booked On",
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
      row.created_at ? String(row.created_at).slice(0, 10) : "",
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
  const isGuest =
    row.is_guest_booking === 1 ||
    row.is_guest_booking === true ||
    String(row.is_guest_booking || "") === "1" ||
    row.user_id == null;
  const paymentStatus = String(row.payment_status || "").toLowerCase();
  const hasTicketQr =
    Boolean(row.check_in_code) && (paymentStatus === "paid" || paymentStatus === "free");

  return {
    ...row,
    is_guest_booking: isGuest ? 1 : 0,
    guest_label: isGuest ? "Guest" : "Registered",
    has_ticket_qr: hasTicketQr,
    checked_in: Boolean(row.checked_in_at),
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

function assertPlatformEventForBooking(event) {
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
}

const { assertBookingContactNames } = require("../utils/bookingContact");

function requireGuestContactFields(payload) {
  const asserted = assertBookingContactNames(payload);
  if (!asserted.ok) {
    throw new ApiError(400, asserted.message);
  }
  const email = String(payload.email || "")
    .trim()
    .toLowerCase();
  const phone = String(payload.phone || "").trim();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApiError(400, "A valid email address is required for guest checkout.");
  }
  if (phone.length < 8) {
    throw new ApiError(400, "Phone number is required for guest checkout.");
  }
  return { name: asserted.name, email, phone };
}

function resolveSignedInContactFields(payload, user) {
  const asserted = assertBookingContactNames(payload);
  if (asserted.ok) {
    return {
      name: asserted.name,
      email: payload.email?.trim()?.toLowerCase() || user.email,
      phone: String(payload.phone || user.mobile_number || "").trim()
    };
  }
  const fallbackName = String(user?.name || "").trim();
  if (fallbackName.length >= 2) {
    return {
      name: fallbackName,
      email: payload.email?.trim()?.toLowerCase() || user.email,
      phone: String(payload.phone || user.mobile_number || "").trim()
    };
  }
  throw new ApiError(400, asserted.message);
}

async function resolveEventBookingPricingCore({ event, payload, userId, user, isGuest }) {
  assertPlatformEventForBooking(event);

  const eventWithLevels = await attachTicketLevelAvailability(event, {
    excludeHoldToken: payload.coupon_hold_token || null
  });

  if (isGuest) {
    if (isExclusiveDealEvent(event)) {
      throw new ApiError(
        403,
        "Exclusive deal events require an account. Please sign in or register to book."
      );
    }
    if (payload.coupon_hold_token) {
      throw new ApiError(400, "Coupon codes are not available for guest checkout. Sign in to use a coupon.");
    }
  }

  const availableDates = getEventAvailableDates(eventWithLevels);
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
    ({ cart, attendeeCount: guests } = resolveBookingCart(eventWithLevels, payload));
  } catch (err) {
    throw new ApiError(400, err.message || "Invalid ticket selection.");
  }
  const reservedSeats = await countReservedSeatsForEvent(payload.event_id, {
    excludeHoldToken: payload.coupon_hold_token || null
  });
  assertSeatsAvailableForBooking(eventWithLevels, guests, reservedSeats);

  let subtotalAmount = computeCartSubtotal(cart, totalDays);
  let discountAmount = 0;
  let totalAmount = subtotalAmount;
  let couponId = null;
  let couponCode = null;
  const holdToken = !isGuest ? payload.coupon_hold_token || null : null;

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

  const feeBreakdown = applyTransactionFee({ subtotalAmount, discountAmount });
  subtotalAmount = feeBreakdown.subtotalAmount;
  discountAmount = feeBreakdown.discountAmount;
  const transactionFeeAmount = feeBreakdown.transactionFeeAmount;
  totalAmount = feeBreakdown.totalAmount;

  const contact = isGuest ? requireGuestContactFields(payload) : resolveSignedInContactFields(payload, user);

  return {
    event: eventWithLevels,
    user,
    isGuest,
    organizerId: eventWithLevels.organizer_id,
    userName: contact.name,
    userEmail: contact.email,
    userPhone: contact.phone,
    selectedDates,
    bookingDate,
    totalDays,
    attendeeCount: guests,
    ticketCart: cart,
    subtotalAmount,
    discountAmount,
    transactionFeeAmount,
    totalAmount,
    couponId,
    couponCode,
    holdToken
  };
}

/** Shared validation and pricing for signed-in bookings and Stripe checkout. */
async function resolveEventBookingPricing({ userId, payload }) {
  const event = await findEventById(payload.event_id);
  const user = await findUserById(userId);
  if (!user || !user.is_active) {
    throw new ApiError(403, "Active user account required");
  }
  return resolveEventBookingPricingCore({ event, payload, userId, user, isGuest: false });
}

/** Guest checkout — no account; exclusive deal events blocked. */
async function resolveGuestEventBookingPricing({ payload }) {
  const event = await findEventById(payload.event_id);
  return resolveEventBookingPricingCore({
    event,
    payload,
    userId: null,
    user: null,
    isGuest: true
  });
}

function bookingEmailContext({ bookingId, checkInCode, payload, pricing, paymentStatus }) {
  const event = pricing.event;
  const guestName = payload.name?.trim() || pricing.userName;
  const guestEmail = String(payload.email?.trim() || pricing.userEmail || pricing.user?.email || "").trim();
  const guestPhone = String(pricing.userPhone || payload.phone || "").trim();
  const status = String(paymentStatus || "paid").toLowerCase();
  let qrImageUrl = null;
  if (checkInCode && (status === "paid" || status === "free")) {
    qrImageUrl = publicBookingQrImageUrl(checkInCode);
  }
  const ticketBlocks = ticketBlocksFromCart(pricing.ticketCart, pricing.totalDays);
  return {
    event,
    guestName,
    guestEmail,
    guestPhone,
    qrImageUrl,
    ticketBlocks,
    paymentStatus: paymentStatus || "paid"
  };
}

async function dispatchBookingConfirmationEmail(ctx) {
  const { event, guestName, guestEmail, qrImageUrl, ticketBlocks, paymentStatus } = ctx;
  if (!guestEmail || !ctx.bookingId || !event) {
    return;
  }

  const mail = buildBookingConfirmationEmail({
    guestName,
    eventTitle: event.title,
    event,
    bookingId: ctx.bookingId,
    selectedDates: ctx.pricing.selectedDates,
    totalDays: ctx.pricing.totalDays,
    attendeeCount: ctx.pricing.attendeeCount,
    ticketBlocks,
    subtotalAmount: ctx.pricing.subtotalAmount,
    discountAmount: ctx.pricing.discountAmount,
    totalAmount: ctx.pricing.totalAmount,
    couponCode: ctx.pricing.couponCode,
    paymentStatus,
    qrImageUrl
  });

  await sendTransactionalEmail({
    to: guestEmail,
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  }).catch(() => {});
}

async function dispatchGuestWelcomeEmail({ guestAccount, guestName }) {
  if (!guestAccount?.created || !guestAccount.email || !guestAccount.temporaryPassword) {
    return;
  }
  const firstName = String(guestName || "there").trim().split(/\s+/)[0] || "there";
  const mail = buildWelcomeEmail({
    firstName,
    guestCheckout: true,
    loginEmail: guestAccount.email,
    temporaryPassword: guestAccount.temporaryPassword
  });
  await sendTransactionalEmail({
    to: guestAccount.email,
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  }).catch(() => {});
}

async function dispatchOrganizerBookingNotificationEmail(ctx) {
  const { event, guestName, guestEmail, guestPhone, ticketBlocks, paymentStatus } = ctx;
  const organizerId = ctx.pricing.organizerId;
  if (!organizerId || !ctx.bookingId || !event) {
    return;
  }
  const organizer = await findUserById(organizerId);
  const organizerEmail = String(organizer?.email || "").trim();
  if (!organizerEmail) {
    return;
  }

  const mail = buildOrganizerBookingNotificationEmail({
    organizerName: organizer.name,
    eventTitle: event.title,
    event,
    bookingId: ctx.bookingId,
    guestName,
    guestEmail,
    guestPhone,
    selectedDates: ctx.pricing.selectedDates,
    totalDays: ctx.pricing.totalDays,
    attendeeCount: ctx.pricing.attendeeCount,
    ticketBlocks,
    subtotalAmount: ctx.pricing.subtotalAmount,
    discountAmount: ctx.pricing.discountAmount,
    totalAmount: ctx.pricing.totalAmount,
    couponCode: ctx.pricing.couponCode,
    paymentStatus,
    isGuestBooking: Boolean(ctx.pricing.isGuest)
  });

  await sendTransactionalEmail({
    to: organizerEmail,
    subject: mail.subject,
    text: mail.text,
    html: mail.html
  }).catch(() => {});
}

async function dispatchBookingEmails({
  bookingId,
  checkInCode,
  payload,
  pricing,
  paymentStatus,
  guestAccount = null
}) {
  const ctx = {
    bookingId,
    checkInCode,
    payload,
    pricing,
    ...bookingEmailContext({ bookingId, checkInCode, payload, pricing, paymentStatus })
  };

  await dispatchBookingConfirmationEmail(ctx);
  await dispatchGuestWelcomeEmail({
    guestAccount,
    guestName: ctx.guestName
  });
  await dispatchOrganizerBookingNotificationEmail(ctx);
}

async function insertBookingFromPricing({ userId, payload, pricing, paymentMeta }) {
  const user = pricing.user;
  const isGuest = Boolean(pricing.isGuest);
  const holdToken = pricing.holdToken;
  const payment_status = paymentMeta?.payment_status || "paid";
  let guestAccount = null;
  let effectiveUserId = userId;

  if (isGuest) {
    const phone = String(pricing.userPhone || payload.phone || "").trim();
    guestAccount = await ensureGuestUserAccount({
      name: pricing.userName,
      email: pricing.userEmail,
      phone
    });
    if (guestAccount?.userId) {
      effectiveUserId = guestAccount.userId;
    }
  }

  const conn = await pool.getConnection();

  try {
    await conn.beginTransaction();

    const phone = String(pricing.userPhone || payload.phone || "").trim();
    if (phone.length < 8) {
      throw new ApiError(400, "Phone number is required for booking.");
    }

    const created = await createBooking(
      {
        event_id: payload.event_id,
        organizer_id: pricing.organizerId,
        user_id: isGuest ? effectiveUserId : userId,
        is_guest_booking: isGuest,
        name: pricing.userName,
        email: pricing.userEmail,
        phone,
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
    const bookingId = created.id;
    const checkInCode = created.check_in_code;

    if (holdToken && pricing.couponId && userId) {
      await couponService.finalizeCouponRedemption(
        { couponId: pricing.couponId, userId, bookingId, holdToken },
        conn
      );
    }

    await conn.commit();

    await dispatchBookingEmails({
      bookingId,
      checkInCode,
      payload,
      pricing,
      paymentStatus: payment_status,
      guestAccount: guestAccount?.created ? guestAccount : null
    }).catch(() => {});

    return {
      bookingId,
      checkInCode,
      selectedDates: pricing.selectedDates,
      totalDays: pricing.totalDays,
      subtotalAmount: pricing.subtotalAmount,
      discountAmount: pricing.discountAmount,
      transactionFeeAmount: pricing.transactionFeeAmount,
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

async function createGuestEventBooking({ payload }) {
  const pricing = await resolveGuestEventBookingPricing({ payload });

  if (requiresStripePayment(pricing.totalAmount)) {
    throw new ApiError(
      400,
      "This booking requires card payment. Use the payment checkout flow."
    );
  }

  return insertBookingFromPricing({
    userId: null,
    payload,
    pricing,
    paymentMeta: {
      payment_status: "free",
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
  resolveGuestEventBookingPricing,
  dispatchBookingEmails,
  dispatchBookingConfirmationEmail,
  createEventBooking,
  createGuestEventBooking,
  insertBookingFromPricing,
  fetchOrganizerBookings,
  fetchAdminBookings,
  fetchUserBookings,
  getOrganizerBookingsExport,
  getAdminBookingsExport
};
