const ApiError = require("../utils/ApiError");
const { pool } = require("../config/db");
const { assertStripeConfigured } = require("../config/stripe");
const { dollarsToCents, requiresStripePayment } = require("../utils/money");
const checkoutPaymentModel = require("../models/checkoutPaymentModel");
const { createBooking, findBookingByPaymentIntentId } = require("../models/bookingModel");
const couponModel = require("../models/couponModel");
const couponService = require("./couponService");
const {
  resolveEventBookingPricing,
  resolveGuestEventBookingPricing,
  dispatchBookingConfirmationEmail
} = require("./bookingService");

const PAYMENT_HOLD_EXTENSION_MINUTES = 30;

function parsePayloadJson(raw) {
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function mapFulfillResult(bookingId, pricing, extra = {}) {
  return {
    bookingId,
    selectedDates: pricing.selectedDates,
    totalDays: pricing.totalDays,
    subtotalAmount: pricing.subtotalAmount,
    discountAmount: pricing.discountAmount,
    transactionFeeAmount: pricing.transactionFeeAmount,
    totalAmount: pricing.totalAmount,
    couponCode: pricing.couponCode,
    paymentStatus: "paid",
    ...extra
  };
}

async function createPaymentIntentCore({ userId, payload, isGuest }) {
  const stripe = assertStripeConfigured();
  const pricing = isGuest
    ? await resolveGuestEventBookingPricing({ payload })
    : await resolveEventBookingPricing({ userId, payload });

  if (!requiresStripePayment(pricing.totalAmount)) {
    throw new ApiError(
      400,
      "This booking total does not require card payment. Use the free checkout endpoint."
    );
  }

  const amountCents = dollarsToCents(pricing.totalAmount);
  const holdToken = payload.coupon_hold_token || null;

  if (holdToken) {
    await couponModel.extendHoldExpiry(holdToken, PAYMENT_HOLD_EXTENSION_MINUTES);
  }

  const storedPayload = {
    event_id: payload.event_id,
    attendee_count: pricing.attendeeCount,
    ticket_items: payload.ticket_items,
    selected_dates: pricing.selectedDates,
    booking_date: pricing.bookingDate,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    coupon_hold_token: holdToken
  };

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency: "usd",
      // `card` enables Apple/Google Pay in Express Checkout; `amazon_pay` is required for Amazon Pay.
      payment_method_types: ["card", "amazon_pay"],
      metadata: {
        guest_checkout: isGuest ? "1" : "0",
        user_id: userId != null ? String(userId) : "",
        event_id: String(payload.event_id),
        attendee_count: String(pricing.attendeeCount)
      },
      description: `Event booking #${payload.event_id}`
    });
  } catch (err) {
    throw new ApiError(502, err?.message || "Could not start payment with Stripe.");
  }

  await checkoutPaymentModel.createCheckoutPayment({
    stripe_payment_intent_id: paymentIntent.id,
    user_id: userId ?? null,
    event_id: payload.event_id,
    status: "requires_payment",
    amount_cents: amountCents,
    currency: "usd",
    payload_json: JSON.stringify(storedPayload)
  });

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amountCents,
    currency: "usd",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    subtotalAmount: pricing.subtotalAmount,
    discountAmount: pricing.discountAmount,
    transactionFeeAmount: pricing.transactionFeeAmount,
    totalAmount: pricing.totalAmount,
    couponCode: pricing.couponCode
  };
}

async function createPaymentIntentForBooking({ userId, payload }) {
  return createPaymentIntentCore({ userId, payload, isGuest: false });
}

async function createPaymentIntentForGuestBooking({ payload }) {
  return createPaymentIntentCore({ userId: null, payload, isGuest: true });
}

/**
 * Idempotent: creates booking once per succeeded PaymentIntent (webhook or client confirm).
 */
async function fulfillPaymentIntent({ paymentIntentId, userId = null, stripeChargeId = null }) {
  const existingBooking = await findBookingByPaymentIntentId(paymentIntentId);
  if (existingBooking) {
    const checkout = await checkoutPaymentModel.findByPaymentIntentId(paymentIntentId);
    const payload = checkout ? parsePayloadJson(checkout.payload_json) : null;
    return {
      alreadyFulfilled: true,
      bookingId: existingBooking.id,
      paymentStatus: existingBooking.payment_status
    };
  }

  const checkout = await checkoutPaymentModel.findByPaymentIntentId(paymentIntentId);
  if (!checkout) {
    throw new ApiError(404, "Checkout session not found for this payment.");
  }

  const isGuestCheckout = checkout.user_id == null;
  if (!isGuestCheckout && userId != null && Number(checkout.user_id) !== Number(userId)) {
    throw new ApiError(403, "This payment belongs to another account.");
  }
  if (isGuestCheckout && userId != null) {
    throw new ApiError(403, "This guest payment cannot be confirmed with a signed-in account.");
  }

  if (checkout.status === "failed" || checkout.status === "canceled") {
    throw new ApiError(400, "This payment did not complete. Please start checkout again.");
  }

  const payload = parsePayloadJson(checkout.payload_json);
  if (!payload) {
    throw new ApiError(500, "Checkout data is invalid.");
  }

  const pricing = isGuestCheckout
    ? await resolveGuestEventBookingPricing({ payload })
    : await resolveEventBookingPricing({
        userId: checkout.user_id,
        payload
      });

  const expectedCents = dollarsToCents(pricing.totalAmount);
  if (expectedCents !== Number(checkout.amount_cents)) {
    throw new ApiError(400, "Payment amount does not match the current booking total. Please start again.");
  }

  const holdToken = payload.coupon_hold_token || null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const bookingId = await createBooking(
      {
        event_id: payload.event_id,
        organizer_id: pricing.organizerId,
        user_id: isGuestCheckout ? null : checkout.user_id,
        is_guest_booking: isGuestCheckout,
        name: pricing.userName,
        email: pricing.userEmail,
        phone: pricing.userPhone,
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
        payment_status: "paid",
        stripe_payment_intent_id: paymentIntentId,
        stripe_charge_id: stripeChargeId,
        amount_paid_cents: expectedCents,
        currency: checkout.currency || "usd",
        paid_at: new Date()
      },
      conn
    );

    if (holdToken && pricing.couponId && checkout.user_id) {
      await couponService.finalizeCouponRedemption(
        { couponId: pricing.couponId, userId: checkout.user_id, bookingId, holdToken },
        conn
      );
    }

    await checkoutPaymentModel.updateCheckoutStatus(
      paymentIntentId,
      {
        status: "succeeded",
        booking_id: bookingId,
        stripe_charge_id: stripeChargeId
      },
      conn
    );

    await conn.commit();

    await dispatchBookingConfirmationEmail({
      bookingId,
      payload,
      pricing,
      paymentStatus: "paid"
    }).catch(() => {});

    return {
      alreadyFulfilled: false,
      ...mapFulfillResult(bookingId, pricing)
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function markCheckoutFailed({ paymentIntentId, failureCode, failureMessage }) {
  const checkout = await checkoutPaymentModel.findByPaymentIntentId(paymentIntentId);
  if (!checkout || checkout.status === "succeeded") {
    return;
  }
  await checkoutPaymentModel.updateCheckoutStatus(paymentIntentId, {
    status: "failed",
    failure_code: failureCode || null,
    failure_message: failureMessage || null
  });
}

async function markCheckoutCanceled(paymentIntentId) {
  const checkout = await checkoutPaymentModel.findByPaymentIntentId(paymentIntentId);
  if (!checkout || checkout.status === "succeeded") {
    return;
  }
  await checkoutPaymentModel.updateCheckoutStatus(paymentIntentId, {
    status: "canceled"
  });
}

async function handleStripeWebhookEvent(event) {
  const type = event.type;
  const pi = event.data?.object;

  if (!pi?.id) {
    return { handled: false };
  }

  if (type === "payment_intent.succeeded") {
    const chargeId =
      typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id || null;
    await fulfillPaymentIntent({
      paymentIntentId: pi.id,
      stripeChargeId: chargeId
    });
    return { handled: true, action: "fulfilled" };
  }

  if (type === "payment_intent.payment_failed") {
    const err = pi.last_payment_error || {};
    await markCheckoutFailed({
      paymentIntentId: pi.id,
      failureCode: err.code || null,
      failureMessage: err.message || "Payment failed"
    });
    return { handled: true, action: "failed" };
  }

  if (type === "payment_intent.canceled") {
    await markCheckoutCanceled(pi.id);
    return { handled: true, action: "canceled" };
  }

  return { handled: false };
}

async function confirmPaymentCore({ userId, paymentIntentId, isGuest }) {
  const stripe = assertStripeConfigured();
  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (isGuest) {
    if (pi.metadata?.guest_checkout !== "1") {
      throw new ApiError(403, "This payment is not a guest checkout session.");
    }
  } else if (Number(pi.metadata?.user_id) !== Number(userId)) {
    throw new ApiError(403, "This payment belongs to another account.");
  }

  if (pi.status === "succeeded") {
    const chargeId =
      typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id || null;
    const result = await fulfillPaymentIntent({
      paymentIntentId,
      userId,
      stripeChargeId: chargeId
    });
    if (result.alreadyFulfilled) {
      const booking = await findBookingByPaymentIntentId(paymentIntentId);
      const checkout = await checkoutPaymentModel.findByPaymentIntentId(paymentIntentId);
      const payload = checkout ? parsePayloadJson(checkout.payload_json) : null;
      if (booking) {
        return {
          alreadyFulfilled: true,
          bookingId: booking.id,
          totalAmount: Number(booking.total_amount),
          selectedDates: payload?.selected_dates || [],
          totalDays: (payload?.selected_dates || []).length || 1,
          paymentStatus: "paid"
        };
      }
    }
    return result;
  }

  if (pi.status === "processing") {
    throw new ApiError(409, "Payment is still processing. Please wait a moment and try again.");
  }

  if (pi.status === "requires_payment_method" || pi.status === "requires_confirmation") {
    throw new ApiError(402, "Payment was not completed. Please try again.");
  }

  if (pi.status === "canceled") {
    await markCheckoutCanceled(paymentIntentId);
    throw new ApiError(400, "Payment was canceled.");
  }

  throw new ApiError(400, `Payment could not be completed (status: ${pi.status}).`);
}

async function confirmPaymentForUser({ userId, paymentIntentId }) {
  return confirmPaymentCore({ userId, paymentIntentId, isGuest: false });
}

async function confirmPaymentForGuest({ paymentIntentId }) {
  return confirmPaymentCore({ userId: null, paymentIntentId, isGuest: true });
}

module.exports = {
  createPaymentIntentForBooking,
  createPaymentIntentForGuestBooking,
  fulfillPaymentIntent,
  confirmPaymentForUser,
  confirmPaymentForGuest,
  handleStripeWebhookEvent,
  markCheckoutFailed,
  markCheckoutCanceled
};
