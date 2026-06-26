const crypto = require("crypto");
const ApiError = require("../utils/ApiError");
const { pool } = require("../config/db");
const { findEventById } = require("../models/eventModel");
const { getEventAvailableDates, normalizeDateList } = require("../utils/eventSchedule");
const couponModel = require("../models/couponModel");
const { isWithinCouponWindow } = require("../utils/couponDatetime");
const {
  resolveBookingCart,
  computeCartSubtotal
} = require("../utils/eventTicketLevels");

const CODE_PATTERN = /^[A-Za-z0-9]{5,20}$/;

function assertValidCodeFormat(code) {
  const raw = String(code || "").trim();
  if (!CODE_PATTERN.test(raw)) {
    throw new ApiError(400, "Coupon code must be 5–20 characters (letters and numbers only).");
  }
  return couponModel.normalizeCouponCode(raw);
}

function computeSubtotal(event, selectedDates, attendeeCount, ticketItems) {
  const totalDays = selectedDates.length;
  if (ticketItems?.length) {
    const { cart } = resolveBookingCart(event, { ticket_items: ticketItems });
    return computeCartSubtotal(cart, totalDays);
  }
  const { cart } = resolveBookingCart(event, { attendee_count: attendeeCount });
  return computeCartSubtotal(cart, totalDays);
}

function computeDiscount(coupon, subtotal) {
  if (subtotal <= 0) {
    return 0;
  }
  let discount = 0;
  if (coupon.discount_type === "percent") {
    discount = (subtotal * Number(coupon.discount_value)) / 100;
    const cap = Number(coupon.max_discount_amount);
    if (Number.isFinite(cap) && cap > 0) {
      discount = Math.min(discount, cap);
    }
  } else {
    discount = Number(coupon.discount_value);
  }
  discount = Math.min(discount, subtotal);
  return Number(discount.toFixed(2));
}

function isCouponInDateWindow(coupon, timezoneOffsetMinutes = 0) {
  return isWithinCouponWindow(coupon.starts_at, coupon.ends_at, timezoneOffsetMinutes);
}

async function assertCouponUsable({
  coupon,
  event,
  userId,
  attendeeCount,
  subtotal,
  excludeHoldId,
  timezoneOffsetMinutes = 0
}) {
  if (!coupon.is_active) {
    throw new ApiError(400, "This coupon is not active.");
  }
  if (!isCouponInDateWindow(coupon, timezoneOffsetMinutes)) {
    throw new ApiError(400, "This coupon is not valid at this time.");
  }
  if (Number(event.organizer_id) !== Number(coupon.organizer_id)) {
    throw new ApiError(400, "This coupon does not apply to this event.");
  }
  const applies = await couponModel.couponAppliesToEvent(coupon, event.id);
  if (!applies) {
    throw new ApiError(400, "This coupon does not apply to this event.");
  }
  if (subtotal <= 0) {
    throw new ApiError(400, "Coupons cannot be applied to free bookings.");
  }
  if (coupon.min_ticket_count != null && attendeeCount < Number(coupon.min_ticket_count)) {
    throw new ApiError(
      400,
      `This coupon requires at least ${coupon.min_ticket_count} ticket${Number(coupon.min_ticket_count) === 1 ? "" : "s"}.`
    );
  }
  if (coupon.min_order_amount != null && subtotal < Number(coupon.min_order_amount)) {
    throw new ApiError(
      400,
      `Minimum order amount for this coupon is $${Number(coupon.min_order_amount).toFixed(2)}.`
    );
  }

  await couponModel.purgeExpiredHolds();

  const globalUsed = Number(coupon.redemption_count || 0);
  const activeHolds = await couponModel.countActiveHoldsForCoupon(coupon.id);
  if (coupon.max_redemptions != null) {
    const reserved = globalUsed + activeHolds - (excludeHoldId ? 1 : 0);
    if (reserved >= Number(coupon.max_redemptions)) {
      throw new ApiError(400, "This coupon has reached its maximum number of uses.");
    }
  }

  if (coupon.max_redemptions_per_user != null) {
    const userRedemptions = await couponModel.countRedemptionsForCouponUser(coupon.id, userId);
    const userHolds = await couponModel.countActiveHoldsForCouponUser(
      coupon.id,
      userId,
      excludeHoldId
    );
    if (userRedemptions + userHolds >= Number(coupon.max_redemptions_per_user)) {
      throw new ApiError(400, "You have already used this coupon the maximum number of times.");
    }
  }
}

async function resolveBookingContext(eventId, attendeeCount, selectedDatesInput, options = {}) {
  const event = await findEventById(eventId);
  if (!event || event.status !== "approved") {
    throw new ApiError(404, "Event not found");
  }
  const ticketSalesMode = event.ticket_sales_mode || "external";
  if (ticketSalesMode !== "platform") {
    throw new ApiError(400, "Coupons apply only to on-site ticket bookings for this event.");
  }

  const availableDates = getEventAvailableDates(event);
  if (!availableDates.length) {
    throw new ApiError(400, "This event has no available booking dates.");
  }

  let selectedDates = normalizeDateList(selectedDatesInput || []);
  if (!selectedDates.length) {
    selectedDates = normalizeDateList([availableDates[0]]);
  }
  const invalidDate = selectedDates.find((date) => !availableDates.includes(date));
  if (invalidDate) {
    throw new ApiError(400, `Selected date ${invalidDate} is not available for this event.`);
  }

  const { cart, attendeeCount: guests } = resolveBookingCart(event, {
    ticket_items: options.ticketItems,
    attendee_count: attendeeCount
  });

  const { countReservedSeatsForEvent } = require("../models/bookingModel");
  const { assertSeatsAvailableForBooking } = require("../utils/eventSeats");
  const reservedSeats = await countReservedSeatsForEvent(eventId, {
    excludeHoldToken: options.excludeHoldToken || null
  });
  assertSeatsAvailableForBooking(event, guests, reservedSeats);

  const subtotal = computeCartSubtotal(cart, selectedDates.length);
  return { event, selectedDates, attendeeCount: guests, subtotal, ticketCart: cart };
}

/** TiDB/MySQL DATETIME is UTC; append Z so clients do not treat it as local time. */
function mysqlDatetimeToUtcIso(value) {
  if (value == null || value === "") {
    return null;
  }
  const s = String(value).trim();
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}/.test(s)) {
    const base = s.replace(" ", "T").slice(0, 19);
    return base.endsWith("Z") ? base : `${base}Z`;
  }
  const parsed = new Date(s);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function formatHoldExpiresAt(expiresAtRaw) {
  if (!expiresAtRaw) {
    return new Date(Date.now() + couponModel.HOLD_MINUTES * 60 * 1000).toISOString();
  }
  return (
    mysqlDatetimeToUtcIso(expiresAtRaw) ||
    new Date(Date.now() + couponModel.HOLD_MINUTES * 60 * 1000).toISOString()
  );
}

function buildHoldResponse({ holdToken, expiresAtRaw, coupon, subtotal, discount, total }) {
  return {
    holdToken,
    expiresAt: formatHoldExpiresAt(expiresAtRaw),
    holdMinutes: couponModel.HOLD_MINUTES,
    couponCode: coupon.code,
    couponId: coupon.id,
    subtotal,
    discount,
    total,
    message: `Coupon applied. Complete your booking within ${couponModel.HOLD_MINUTES} minutes to keep this rate.`
  };
}

async function releaseCouponHold({ userId, holdToken, eventId }) {
  await couponModel.purgeExpiredHolds();
  const hold = await couponModel.findHoldByToken(holdToken);
  if (!hold) {
    return { released: true };
  }
  if (Number(hold.user_id) !== Number(userId)) {
    throw new ApiError(403, "This coupon hold belongs to another account.");
  }
  if (eventId != null && Number(hold.event_id) !== Number(eventId)) {
    throw new ApiError(400, "Coupon hold does not match this event.");
  }
  await couponModel.deleteHoldByToken(holdToken);
  return { released: true };
}

async function resumeCouponHold({ userId, eventId, holdToken, ticketItems = null, timezoneOffsetMinutes = 0 }) {
  await couponModel.purgeExpiredHolds();
  const hold = await couponModel.findActiveHoldByToken(holdToken);
  if (!hold) {
    const expired = await couponModel.findHoldByToken(holdToken);
    if (expired) {
      await couponModel.deleteHoldByToken(holdToken);
      throw new ApiError(400, "Coupon hold expired. Please apply the coupon again.");
    }
    throw new ApiError(400, "Coupon hold expired or invalid. Please apply the coupon again.");
  }
  if (Number(hold.user_id) !== Number(userId)) {
    throw new ApiError(403, "This coupon hold belongs to another account.");
  }
  if (Number(hold.event_id) !== Number(eventId)) {
    throw new ApiError(400, "Coupon hold does not match this event.");
  }

  const event = await findEventById(eventId);
  if (!event || event.status !== "approved") {
    throw new ApiError(404, "Event not found");
  }

  const coupon = await couponModel.findCouponByIdForOrganizer(hold.coupon_id, event.organizer_id);
  if (!coupon) {
    throw new ApiError(400, "Coupon is no longer available.");
  }

  const dates = normalizeDateList(JSON.parse(hold.selected_dates_json || "[]"));
  const guests = Number(hold.attendee_count);
  const subtotal = computeSubtotal(event, dates, guests, ticketItems);

  await assertCouponUsable({
    coupon,
    event,
    userId,
    attendeeCount: guests,
    subtotal,
    excludeHoldId: hold.id,
    timezoneOffsetMinutes
  });

  const discount = computeDiscount(coupon, subtotal);
  const total = Number((subtotal - discount).toFixed(2));

  await couponModel.updateHoldPricing(hold.id, {
    attendee_count: guests,
    selected_dates_json: JSON.stringify(dates),
    subtotal_amount: subtotal,
    discount_amount: discount,
    total_amount: total
  });

  return buildHoldResponse({
    holdToken: hold.hold_token,
    expiresAtRaw: hold.expires_at,
    coupon,
    subtotal,
    discount,
    total
  });
}

async function applyCouponHold({
  userId,
  eventId,
  couponCode,
  attendeeCount,
  ticketItems = null,
  selectedDates,
  timezoneOffsetMinutes = 0,
  existingHoldToken = null
}) {
  if (existingHoldToken) {
    try {
      return await resumeCouponHold({
        userId,
        eventId,
        holdToken: existingHoldToken,
        ticketItems,
        timezoneOffsetMinutes
      });
    } catch (err) {
      if (!(err instanceof ApiError) || err.statusCode !== 400) {
        throw err;
      }
    }
  }

  const normalizedCode = assertValidCodeFormat(couponCode);
  const { event, selectedDates: dates, attendeeCount: guests, subtotal } = await resolveBookingContext(
    eventId,
    attendeeCount,
    selectedDates,
    { excludeHoldToken: existingHoldToken || null, ticketItems }
  );

  const coupon = await couponModel.findCouponByOrganizerAndCode(event.organizer_id, normalizedCode);
  if (!coupon) {
    throw new ApiError(404, "Coupon code not found.");
  }

  await couponModel.purgeExpiredHolds();

  const existing = await couponModel.findActiveHoldForUserCouponEvent(userId, coupon.id, event.id);
  if (existing) {
    const existingDates = normalizeDateList(JSON.parse(existing.selected_dates_json || "[]"));
    const datesMatch = existingDates.join(",") === dates.join(",");
    const guestsMatch = Number(existing.attendee_count) === guests;
    if (datesMatch && guestsMatch) {
      await assertCouponUsable({
        coupon,
        event,
        userId,
        attendeeCount: guests,
        subtotal,
        excludeHoldId: existing.id,
        timezoneOffsetMinutes
      });
      const discount = computeDiscount(coupon, subtotal);
      const total = Number((subtotal - discount).toFixed(2));
      await couponModel.updateHoldPricing(existing.id, {
        attendee_count: guests,
        selected_dates_json: JSON.stringify(dates),
        subtotal_amount: subtotal,
        discount_amount: discount,
        total_amount: total
      });
      return buildHoldResponse({
        holdToken: existing.hold_token,
        expiresAtRaw: existing.expires_at,
        coupon,
        subtotal,
        discount,
        total
      });
    }
  }

  await assertCouponUsable({
    coupon,
    event,
    userId,
    attendeeCount: guests,
    subtotal,
    timezoneOffsetMinutes
  });

  const discount = computeDiscount(coupon, subtotal);
  const total = Number((subtotal - discount).toFixed(2));
  const holdToken = crypto.randomUUID();

  await couponModel.deleteHoldsForUserCouponEvent(userId, coupon.id, event.id);
  await couponModel.createHold({
    coupon_id: coupon.id,
    user_id: userId,
    event_id: event.id,
    hold_token: holdToken,
    attendee_count: guests,
    selected_dates_json: JSON.stringify(dates),
    subtotal_amount: subtotal,
    discount_amount: discount,
    total_amount: total
  });

  const inserted = await couponModel.findActiveHoldByToken(holdToken);

  return buildHoldResponse({
    holdToken,
    expiresAtRaw: inserted?.expires_at,
    coupon,
    subtotal,
    discount,
    total
  });
}

async function consumeHoldForBooking({ userId, holdToken, eventId, attendeeCount, selectedDates, ticketItems = null }) {
  await couponModel.purgeExpiredHolds();
  const hold = await couponModel.findActiveHoldByToken(holdToken);
  if (!hold) {
    const expired = await couponModel.findHoldByToken(holdToken);
    if (expired) {
      await couponModel.deleteHoldByToken(holdToken);
      throw new ApiError(400, "Coupon hold expired. Please apply the coupon again.");
    }
    throw new ApiError(400, "Coupon hold expired or invalid. Please apply the coupon again.");
  }
  if (Number(hold.user_id) !== Number(userId)) {
    throw new ApiError(403, "This coupon hold belongs to another account.");
  }
  if (Number(hold.event_id) !== Number(eventId)) {
    throw new ApiError(400, "Coupon hold does not match this event.");
  }

  const parsedHoldDates = normalizeDateList(JSON.parse(hold.selected_dates_json || "[]"));
  const { event, selectedDates: dates, attendeeCount: guests, subtotal } = await resolveBookingContext(
    eventId,
    attendeeCount,
    selectedDates,
    { excludeHoldToken: holdToken, ticketItems }
  );

  if (guests !== Number(hold.attendee_count)) {
    throw new ApiError(400, "Ticket count changed. Please apply the coupon again.");
  }
  const holdDatesKey = parsedHoldDates.join(",");
  const requestDatesKey = dates.join(",");
  if (holdDatesKey !== requestDatesKey) {
    throw new ApiError(400, "Selected dates changed. Please apply the coupon again.");
  }

  const coupon = await couponModel.findCouponByIdForOrganizer(hold.coupon_id, event.organizer_id);
  if (!coupon) {
    throw new ApiError(400, "Coupon is no longer available.");
  }

  await assertCouponUsable({
    coupon,
    event,
    userId,
    attendeeCount: guests,
    subtotal,
    excludeHoldId: hold.id
  });

  const discount = computeDiscount(coupon, subtotal);
  const total = Number((subtotal - discount).toFixed(2));

  if (
    Number(hold.subtotal_amount) !== subtotal ||
    Number(hold.discount_amount) !== discount ||
    Number(hold.total_amount) !== total
  ) {
    throw new ApiError(400, "Pricing changed. Please apply the coupon again.");
  }

  return {
    coupon,
    subtotal,
    discount,
    total,
    selectedDates: dates,
    attendeeCount: guests,
    hold
  };
}

async function finalizeCouponRedemption({ couponId, userId, bookingId, holdToken }, conn) {
  await couponModel.deleteHoldByToken(holdToken, conn);
  await couponModel.incrementCouponRedemption(couponId, conn);
  await couponModel.insertRedemption({ couponId, userId, bookingId }, conn);
}

async function listOrganizerCoupons(organizerId) {
  return couponModel.listCouponsByOrganizer(organizerId);
}

async function createOrganizerCoupon(organizerId, body) {
  const code = assertValidCodeFormat(body.code);
  const existing = await couponModel.findCouponByOrganizerAndCode(organizerId, code);
  if (existing) {
    throw new ApiError(409, "You already have a coupon with this code.");
  }

  const payload = mapCouponPayload(organizerId, body, code);
  validateCouponPayload(payload);
  const id = await couponModel.createCoupon(payload);
  return getOrganizerCouponDetail(organizerId, id);
}

async function updateOrganizerCoupon(organizerId, couponId, body) {
  const current = await couponModel.findCouponByIdForOrganizer(couponId, organizerId);
  if (!current) {
    throw new ApiError(404, "Coupon not found");
  }

  const code = assertValidCodeFormat(body.code);
  if (code !== current.code) {
    const existing = await couponModel.findCouponByOrganizerAndCode(organizerId, code);
    if (existing && Number(existing.id) !== Number(couponId)) {
      throw new ApiError(409, "You already have a coupon with this code.");
    }
  }

  const payload = mapCouponPayload(organizerId, body, code);
  validateCouponPayload(payload);
  await couponModel.updateCoupon(couponId, payload);
  return getOrganizerCouponDetail(organizerId, couponId);
}

function mapCouponPayload(organizerId, body, code) {
  const maxDiscountAmount =
    body.discount_type === "percent" && Number(body.max_discount_amount) > 0
      ? Number(body.max_discount_amount)
      : null;

  return {
    organizer_id: organizerId,
    code,
    discount_type: body.discount_type,
    discount_value: Number(body.discount_value),
    scope: body.scope,
    starts_at: body.starts_at || null,
    ends_at: body.ends_at || null,
    is_active: body.is_active !== false,
    max_redemptions: body.max_redemptions ?? null,
    max_redemptions_per_user: body.max_redemptions_per_user ?? null,
    min_ticket_count: body.min_ticket_count ?? null,
    min_order_amount: body.min_order_amount ?? null,
    max_discount_amount: maxDiscountAmount,
    event_ids: Array.isArray(body.event_ids) ? body.event_ids.map(Number) : []
  };
}

function validateCouponPayload(payload) {
  if (!["percent", "fixed_amount"].includes(payload.discount_type)) {
    throw new ApiError(400, "Invalid discount type.");
  }
  if (!Number.isFinite(payload.discount_value) || payload.discount_value <= 0) {
    throw new ApiError(400, "Discount value must be greater than zero.");
  }
  if (payload.discount_type === "percent" && payload.discount_value > 100) {
    throw new ApiError(400, "Percent discount cannot exceed 100.");
  }
  if (!["all_events", "specific_events"].includes(payload.scope)) {
    throw new ApiError(400, "Invalid coupon scope.");
  }
  if (payload.scope === "specific_events" && !payload.event_ids.length) {
    throw new ApiError(400, "Select at least one event for this coupon.");
  }
}

async function deactivateOrganizerCoupon(organizerId, couponId) {
  const current = await couponModel.findCouponByIdForOrganizer(couponId, organizerId);
  if (!current) {
    throw new ApiError(404, "Coupon not found");
  }
  await couponModel.setCouponActive(couponId, false);
  return { ...current, is_active: 0 };
}

async function deleteOrganizerCoupon(organizerId, couponId) {
  const current = await couponModel.findCouponByIdForOrganizer(couponId, organizerId);
  if (!current) {
    throw new ApiError(404, "Coupon not found");
  }
  const redemptions = await couponModel.getCouponRedemptionCount(couponId);
  if (redemptions > 0) {
    throw new ApiError(
      400,
      "This coupon has been used and cannot be deleted. Deactivate it instead to stop new redemptions."
    );
  }
  await couponModel.purgeExpiredHolds();
  const holds = await couponModel.countActiveHoldsForCoupon(couponId);
  if (holds > 0) {
    throw new ApiError(400, "This coupon has active holds. Try again in a few minutes or deactivate it.");
  }
  await couponModel.deleteCouponById(couponId);
}

async function activateOrganizerCoupon(organizerId, couponId) {
  const current = await couponModel.findCouponByIdForOrganizer(couponId, organizerId);
  if (!current) {
    throw new ApiError(404, "Coupon not found");
  }
  await couponModel.setCouponActive(couponId, true);
  return { ...current, is_active: 1 };
}

async function getOrganizerCouponDetail(organizerId, couponId) {
  const row = await couponModel.findCouponByIdForOrganizer(couponId, organizerId);
  if (!row) {
    throw new ApiError(404, "Coupon not found");
  }
  const eventIds = row.scope === "specific_events" ? await couponModel.listCouponEventIds(couponId) : [];
  const activeHolds = await couponModel.countActiveHoldsForCoupon(couponId);
  return { ...row, event_ids: eventIds, active_holds: activeHolds };
}

module.exports = {
  applyCouponHold,
  resumeCouponHold,
  releaseCouponHold,
  consumeHoldForBooking,
  finalizeCouponRedemption,
  listOrganizerCoupons,
  createOrganizerCoupon,
  updateOrganizerCoupon,
  deactivateOrganizerCoupon,
  activateOrganizerCoupon,
  deleteOrganizerCoupon,
  getOrganizerCouponDetail,
  computeSubtotal,
  computeDiscount
};
