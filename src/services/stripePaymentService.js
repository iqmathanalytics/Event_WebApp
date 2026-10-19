const ApiError = require("../utils/ApiError");
const { pool } = require("../config/db");
const { assertStripeConfigured } = require("../config/stripe");
const { dollarsToCents, requiresStripePayment } = require("../utils/money");
const checkoutPaymentModel = require("../models/checkoutPaymentModel");
const { createBooking, findBookingByPaymentIntentId } = require("../models/bookingModel");
const couponModel = require("../models/couponModel");
const couponService = require("./couponService");
const { findEventById } = require("../models/eventModel");
const {
  resolveEventBookingPricing,
  resolveGuestEventBookingPricing,
  dispatchBookingEmails,
  retryUnsentBookingEmailsForPaymentIntent
} = require("./bookingService");
const seatsioService = require("./seatsioService");
const { ensureGuestUserAccount } = require("./guestAccountService");

const PAYMENT_HOLD_EXTENSION_MINUTES = 30;
const PI_POLL_ATTEMPTS = 20;
const PI_POLL_DELAY_MS = 1500;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function buildPricingSnapshot(pricing, payload) {
  return {
    organizerId: pricing.organizerId,
    userName: pricing.userName,
    userEmail: pricing.userEmail,
    userPhone: pricing.userPhone,
    selectedDates: pricing.selectedDates,
    bookingDate: pricing.bookingDate,
    totalDays: pricing.totalDays,
    attendeeCount: pricing.attendeeCount,
    ticketCart: pricing.ticketCart,
    subtotalAmount: pricing.subtotalAmount,
    discountAmount: pricing.discountAmount,
    serviceFeeAmount: pricing.serviceFeeAmount ?? 0,
    platformFeeAmount: pricing.platformFeeAmount ?? 0,
    transactionFeeAmount: pricing.transactionFeeAmount,
    totalAmount: pricing.totalAmount,
    couponId: pricing.couponId,
    couponCode: pricing.couponCode,
    vendorCode: pricing.vendorCode || payload.vendor_code || null,
    seatsioHoldToken: pricing.seatsioHoldToken || payload.seatsio_hold_token || null,
    selectedSeats: Array.isArray(pricing.selectedSeats)
      ? pricing.selectedSeats
      : Array.isArray(payload.selected_seats)
        ? payload.selected_seats
        : null
  };
}

function pricingFromSnapshot(payload) {
  const snap = payload?.pricing_snapshot;
  if (!snap || snap.totalAmount == null) {
    return null;
  }
  return {
    organizerId: snap.organizerId,
    userName: snap.userName || payload.name,
    userEmail: snap.userEmail || payload.email,
    userPhone: snap.userPhone || payload.phone,
    selectedDates: snap.selectedDates || payload.selected_dates || [],
    bookingDate: snap.bookingDate || payload.booking_date,
    totalDays: snap.totalDays ?? (snap.selectedDates?.length || 1),
    attendeeCount: snap.attendeeCount ?? payload.attendee_count,
    ticketCart: snap.ticketCart || [],
    subtotalAmount: snap.subtotalAmount,
    discountAmount: snap.discountAmount,
    serviceFeeAmount: snap.serviceFeeAmount ?? 0,
    platformFeeAmount: snap.platformFeeAmount ?? 0,
    transactionFeeAmount: snap.transactionFeeAmount ?? 0,
    totalAmount: snap.totalAmount,
    couponId: snap.couponId ?? null,
    couponCode: snap.couponCode ?? null,
    vendorCode: snap.vendorCode || payload.vendor_code || null,
    holdToken: payload.coupon_hold_token || null,
    seatsioHoldToken: snap.seatsioHoldToken || payload.seatsio_hold_token || null,
    selectedSeats: Array.isArray(snap.selectedSeats)
      ? snap.selectedSeats
      : Array.isArray(payload.selected_seats)
        ? payload.selected_seats
        : null
  };
}

async function resolvePricingForFulfillment({ checkout, payload, isGuestCheckout }) {
  const holdToken = payload.coupon_hold_token || null;
  if (holdToken) {
    await couponModel.extendHoldExpiry(holdToken, PAYMENT_HOLD_EXTENSION_MINUTES);
  }

  try {
    if (isGuestCheckout) {
      return await resolveGuestEventBookingPricing({ payload });
    }
    return await resolveEventBookingPricing({ userId: checkout.user_id, payload });
  } catch (err) {
    if (!(err instanceof ApiError) || err.statusCode >= 500) {
      throw err;
    }
    const fromSnap = pricingFromSnapshot(payload);
    if (!fromSnap) {
      throw err;
    }
    const event = await findEventById(payload.event_id);
    if (!event) {
      throw new ApiError(404, "Event not found");
    }
    return {
      ...fromSnap,
      event,
      user: null,
      isGuest: isGuestCheckout
    };
  }
}

/** Apple Pay / Google Pay / Amazon Pay may stay in `processing` briefly after the customer approves payment. */
async function waitForPaymentIntentSucceeded(stripe, paymentIntentId) {
  let pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  for (let attempt = 0; attempt < PI_POLL_ATTEMPTS && pi.status === "processing"; attempt += 1) {
    await sleep(PI_POLL_DELAY_MS);
    pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  }
  return pi;
}

function parsePayloadJson(raw) {
  try {
    return typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch {
    return null;
  }
}

function buildStripePaymentDescription({ eventId, bookingId = null }) {
  const eventPart = `Event #${eventId}`;
  if (bookingId != null && String(bookingId).trim() !== "") {
    return `${eventPart} · Booking ref #${bookingId}`;
  }
  return `${eventPart} · booking pending`;
}

function stripeCustomerContact({ name, email, phone }) {
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  const normalizedName = String(name || "").trim();
  const normalizedPhone = String(phone || "").trim();
  return {
    email: normalizedEmail || null,
    name: normalizedName || null,
    phone: normalizedPhone || null
  };
}

async function ensureStripeCustomer(stripe, { name, email, phone }) {
  const contact = stripeCustomerContact({ name, email, phone });
  if (!contact.email) {
    return null;
  }
  try {
    const listed = await stripe.customers.list({ email: contact.email, limit: 1 });
    const existing = listed?.data?.[0];
    if (existing?.id) {
      const patch = {};
      if (contact.name && contact.name !== existing.name) {
        patch.name = contact.name;
      }
      if (contact.phone && contact.phone !== existing.phone) {
        patch.phone = contact.phone;
      }
      if (Object.keys(patch).length) {
        await stripe.customers.update(existing.id, patch);
      }
      return existing.id;
    }
    const created = await stripe.customers.create({
      email: contact.email,
      name: contact.name || undefined,
      phone: contact.phone || undefined,
      metadata: { source: "bookmytickets" }
    });
    return created.id;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[stripe] ensureStripeCustomer failed:", err?.message || err);
    return null;
  }
}

/** Best-effort: keep Stripe Dashboard description + customer fields in sync with booking. */
async function syncStripePaymentRecord({
  stripe,
  paymentIntentId,
  chargeId = null,
  eventId,
  bookingId = null,
  name = null,
  email = null,
  phone = null
}) {
  const contact = stripeCustomerContact({ name, email, phone });
  const description = buildStripePaymentDescription({ eventId, bookingId });
  const metadata = {
    event_id: String(eventId),
    ...(bookingId != null ? { booking_id: String(bookingId) } : {}),
    ...(contact.name ? { customer_name: contact.name.slice(0, 450) } : {}),
    ...(contact.email ? { customer_email: contact.email.slice(0, 450) } : {}),
    ...(contact.phone ? { customer_phone: contact.phone.slice(0, 450) } : {})
  };

  try {
    await stripe.paymentIntents.update(paymentIntentId, {
      description,
      metadata,
      ...(contact.email ? { receipt_email: contact.email } : {})
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[stripe] paymentIntents.update failed:", paymentIntentId, err?.message || err);
  }

  const resolvedChargeId =
    chargeId ||
    (await stripe.paymentIntents
      .retrieve(paymentIntentId)
      .then((pi) => (typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id || null))
      .catch(() => null));

  if (resolvedChargeId) {
    try {
      await stripe.charges.update(resolvedChargeId, {
        description,
        metadata,
        ...(contact.email ? { receipt_email: contact.email } : {})
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn("[stripe] charges.update failed:", resolvedChargeId, err?.message || err);
    }
  }
}

function mapFulfillResult(bookingId, pricing, extra = {}) {
  return {
    bookingId,
    selectedDates: pricing.selectedDates,
    totalDays: pricing.totalDays,
    subtotalAmount: pricing.subtotalAmount,
    discountAmount: pricing.discountAmount,
    serviceFeeAmount: pricing.serviceFeeAmount ?? 0,
    platformFeeAmount: pricing.platformFeeAmount ?? 0,
    transactionFeeAmount: pricing.transactionFeeAmount,
    totalAmount: pricing.totalAmount,
    couponCode: pricing.couponCode,
    paymentStatus: "paid",
    ...extra
  };
}

/**
 * A prior attempt may already be charged in Stripe while our checkout row is still unpaid
 * (slow confirm / webhook lag). Never start a new charge in that case.
 */
async function guardPriorChargedAttempts({ stripe, openRows, userId, isGuest }) {
  for (const row of openRows || []) {
    const piId = String(row.stripe_payment_intent_id || "").trim();
    if (!piId) {
      continue;
    }
    let pi;
    try {
      pi = await stripe.paymentIntents.retrieve(piId);
    } catch (_err) {
      continue;
    }
    if (pi.status === "succeeded") {
      const chargeId =
        typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id || null;
      let bookingId = null;
      try {
        const result = await fulfillPaymentIntent({
          paymentIntentId: piId,
          userId: isGuest ? null : userId,
          stripeChargeId: chargeId
        });
        bookingId = result?.bookingId ?? null;
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn("[stripe] fulfill of prior charged attempt failed:", piId, err?.message || err);
      }
      throw new ApiError(
        409,
        bookingId
          ? `Your earlier payment for this order already went through (booking #${bookingId}). Check your email for tickets — you were not charged again.`
          : "Your earlier payment for this order already went through. We are saving your booking — please do not pay again. Contact support if you do not get tickets by email.",
        { code: "ALREADY_PAID", paymentIntentId: piId, bookingId }
      );
    }
    if (pi.status === "processing") {
      throw new ApiError(
        409,
        "Your earlier payment for this order is still processing. Please wait a moment instead of paying again.",
        { code: "PAYMENT_PROCESSING", paymentIntentId: piId }
      );
    }
  }
}

async function cancelOpenCheckoutPaymentIntents({ stripe, openRows }) {
  for (const row of openRows || []) {
    const piId = String(row.stripe_payment_intent_id || "").trim();
    if (!piId) {
      continue;
    }
    try {
      const pi = await stripe.paymentIntents.retrieve(piId);
      if (pi.status === "succeeded" || pi.status === "processing") {
        continue;
      }
      if (pi.status !== "canceled") {
        const cancelable = new Set([
          "requires_payment_method",
          "requires_confirmation",
          "requires_action",
          "requires_capture"
        ]);
        if (cancelable.has(pi.status)) {
          await stripe.paymentIntents.cancel(piId, { cancellation_reason: "abandoned" });
        }
      }
      if (row.status !== "canceled" && row.status !== "succeeded") {
        await markCheckoutCanceled(piId).catch(() => {});
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn(
        "[stripe] could not cancel prior open PaymentIntent",
        piId,
        err?.message || err
      );
    }
  }
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
  const buyerEmail = String(pricing.userEmail || payload.email || "")
    .trim()
    .toLowerCase();
  const checkoutAttemptId = String(payload.checkout_attempt_id || "").trim() || null;

  if (holdToken) {
    await couponModel.extendHoldExpiry(holdToken, PAYMENT_HOLD_EXTENSION_MINUTES);
  }

  const openRows = await checkoutPaymentModel.findOpenCheckoutsForBuyer({
    eventId: payload.event_id,
    userId: userId ?? null,
    email: buyerEmail || null
  });

  await guardPriorChargedAttempts({ stripe, openRows, userId, isGuest });

  // Same buyer already paid for this event recently — require an explicit "buy again".
  if (payload.confirm_repeat_purchase !== true) {
    const recentPaid = await checkoutPaymentModel.findRecentSucceededCheckouts({
      eventId: payload.event_id,
      userId: userId ?? null,
      email: buyerEmail || null,
      withinMinutes: 24 * 60
    });
    if (recentPaid.length) {
      const existing = recentPaid[0];
      throw new ApiError(
        409,
        existing.booking_id
          ? `You already booked this event (booking #${existing.booking_id}). Check your email for tickets. Do you want to buy another order?`
          : "You already paid for this event recently. Check your email for tickets. Do you want to buy another order?",
        { code: "REPEAT_PURCHASE", bookingId: existing.booking_id ?? null }
      );
    }
  }
  if (checkoutAttemptId && openRows.length) {
    const sameAttempt = openRows.find((row) => {
      const snap = parsePayloadJson(row.payload_json);
      return String(snap?.checkout_attempt_id || "").trim() === checkoutAttemptId;
    });
    if (sameAttempt?.stripe_payment_intent_id) {
      try {
        const existingPi = await stripe.paymentIntents.retrieve(sameAttempt.stripe_payment_intent_id);
        if (
          existingPi.status === "requires_payment_method" ||
          existingPi.status === "requires_confirmation" ||
          existingPi.status === "requires_action"
        ) {
          return {
            clientSecret: existingPi.client_secret,
            paymentIntentId: existingPi.id,
            amountCents,
            currency: "usd",
            publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
            subtotalAmount: pricing.subtotalAmount,
            discountAmount: pricing.discountAmount,
            serviceFeeAmount: pricing.serviceFeeAmount ?? 0,
            platformFeeAmount: pricing.platformFeeAmount ?? 0,
            transactionFeeAmount: pricing.transactionFeeAmount,
            totalAmount: pricing.totalAmount,
            couponCode: pricing.couponCode,
            reused: true
          };
        }
      } catch (_err) {
        /* create a fresh PI below */
      }
    }
  }
  const opensToCancel = (openRows || []).filter((row) => {
    if (!checkoutAttemptId) {
      return true;
    }
    const snap = parsePayloadJson(row.payload_json);
    return String(snap?.checkout_attempt_id || "").trim() !== checkoutAttemptId;
  });
  if (opensToCancel.length) {
    await cancelOpenCheckoutPaymentIntents({ stripe, openRows: opensToCancel });
  }

  const storedPayload = {
    event_id: payload.event_id,
    attendee_count: pricing.attendeeCount,
    ticket_items: payload.ticket_items,
    selected_dates: pricing.selectedDates,
    booking_date: pricing.bookingDate,
    name: payload.name,
    email: payload.email || pricing.userEmail,
    phone: payload.phone,
    first_name: payload.first_name,
    last_name: payload.last_name,
    coupon_hold_token: holdToken,
    vendor_code: pricing.vendorCode || payload.vendor_code || null,
    seatsio_hold_token: pricing.seatsioHoldToken || payload.seatsio_hold_token || null,
    selected_seats: Array.isArray(pricing.selectedSeats)
      ? pricing.selectedSeats
      : Array.isArray(payload.selected_seats)
        ? payload.selected_seats
        : undefined,
    checkout_attempt_id: checkoutAttemptId,
    pricing_snapshot: buildPricingSnapshot(pricing, payload)
  };

  const buyerName = String(pricing.userName || payload.name || "").trim();
  const buyerPhone = String(pricing.userPhone || payload.phone || "").trim();
  const stripeCustomerId = await ensureStripeCustomer(stripe, {
    name: buyerName,
    email: buyerEmail,
    phone: buyerPhone
  });

  const createParams = {
    amount: amountCents,
    currency: "usd",
    // `card` enables Apple Pay + Google Pay (wallets); `amazon_pay` enables Amazon Pay in Express Checkout.
    payment_method_types: ["card", "amazon_pay"],
    ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
    ...(buyerEmail ? { receipt_email: buyerEmail } : {}),
    metadata: {
      guest_checkout: isGuest ? "1" : "0",
      user_id: userId != null ? String(userId) : "",
      event_id: String(payload.event_id),
      attendee_count: String(pricing.attendeeCount),
      ...(checkoutAttemptId ? { checkout_attempt_id: checkoutAttemptId } : {}),
      ...(buyerName ? { customer_name: buyerName.slice(0, 450) } : {}),
      ...(buyerEmail ? { customer_email: buyerEmail.slice(0, 450) } : {}),
      ...(buyerPhone ? { customer_phone: buyerPhone.slice(0, 450) } : {})
    },
    description: buildStripePaymentDescription({ eventId: payload.event_id })
  };

  let paymentIntent;
  try {
    paymentIntent = await stripe.paymentIntents.create(
      createParams,
      checkoutAttemptId
        ? { idempotencyKey: `bmt-pi-${checkoutAttemptId}` }
        : undefined
    );
  } catch (err) {
    throw new ApiError(502, err?.message || "Could not start payment with Stripe.");
  }

  // Idempotent retries may return an existing PI — avoid duplicate checkout rows.
  const existingCheckout = await checkoutPaymentModel.findByPaymentIntentId(paymentIntent.id);
  if (!existingCheckout) {
    try {
      await checkoutPaymentModel.createCheckoutPayment({
        stripe_payment_intent_id: paymentIntent.id,
        user_id: userId ?? null,
        event_id: payload.event_id,
        status: "requires_payment",
        amount_cents: amountCents,
        currency: "usd",
        payload_json: JSON.stringify(storedPayload)
      });
    } catch (err) {
      const raced = await checkoutPaymentModel.findByPaymentIntentId(paymentIntent.id);
      if (!raced) {
        throw err;
      }
    }
  } else if (existingCheckout.status === "canceled" || existingCheckout.status === "failed") {
    await checkoutPaymentModel.updateCheckoutStatus(paymentIntent.id, {
      status: "requires_payment"
    });
  }

  return {
    clientSecret: paymentIntent.client_secret,
    paymentIntentId: paymentIntent.id,
    amountCents,
    currency: "usd",
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
    subtotalAmount: pricing.subtotalAmount,
    discountAmount: pricing.discountAmount,
    serviceFeeAmount: pricing.serviceFeeAmount ?? 0,
    platformFeeAmount: pricing.platformFeeAmount ?? 0,
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
    await retryUnsentBookingEmailsForPaymentIntent(paymentIntentId).catch((err) => {
      // eslint-disable-next-line no-console
      console.warn(
        "[stripe] retry unsent booking emails failed:",
        err?.message || err
      );
    });
    const stripe = assertStripeConfigured();
    await syncStripePaymentRecord({
      stripe,
      paymentIntentId,
      chargeId: stripeChargeId || null,
      eventId: existingBooking.event_id,
      bookingId: existingBooking.id,
      name: existingBooking.name,
      email: existingBooking.email,
      phone: existingBooking.phone
    }).catch(() => {});
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

  // Stripe success is authoritative. payment_intent.payment_failed may have marked this
  // checkout failed (or canceled) before the same PaymentIntent later succeeded.
  // Do not block fulfillment in that case — booking creation is still idempotent by PI id.

  const payload = parsePayloadJson(checkout.payload_json);
  if (!payload) {
    throw new ApiError(500, "Checkout data is invalid.");
  }

  let pricing = await resolvePricingForFulfillment({
    checkout,
    payload,
    isGuestCheckout
  });

  let expectedCents = dollarsToCents(pricing.totalAmount);
  if (expectedCents !== Number(checkout.amount_cents)) {
    // Customer was already charged the snapshot total; live pricing changed since checkout.
    const fromSnap = pricingFromSnapshot(payload);
    if (!fromSnap || dollarsToCents(fromSnap.totalAmount) !== Number(checkout.amount_cents)) {
      throw new ApiError(400, "Payment amount does not match the current booking total. Please start again.");
    }
    // eslint-disable-next-line no-console
    console.warn(
      "[stripe] live pricing differs from paid amount; fulfilling from checkout snapshot:",
      paymentIntentId
    );
    const event = pricing.event || (await findEventById(payload.event_id));
    if (!event) {
      throw new ApiError(404, "Event not found");
    }
    pricing = {
      ...fromSnap,
      event,
      user: pricing.user ?? null,
      isGuest: isGuestCheckout
    };
    expectedCents = Number(checkout.amount_cents);
  }

  const holdToken = payload.coupon_hold_token || null;

  let guestAccount = null;
  let bookingUserId = checkout.user_id;
  if (isGuestCheckout) {
    guestAccount = await ensureGuestUserAccount({
      name: pricing.userName,
      email: pricing.userEmail,
      phone: pricing.userPhone
    });
    if (guestAccount?.userId) {
      bookingUserId = guestAccount.userId;
    }
  }

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const created = await createBooking(
      {
        event_id: payload.event_id,
        organizer_id: pricing.organizerId,
        user_id: isGuestCheckout ? bookingUserId : checkout.user_id,
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
        vendor_code: pricing.vendorCode,
        payment_status: "paid",
        stripe_payment_intent_id: paymentIntentId,
        stripe_charge_id: stripeChargeId,
        amount_paid_cents: expectedCents,
        currency: checkout.currency || "usd",
        paid_at: new Date(),
        seatsio_hold_token: pricing.seatsioHoldToken || payload.seatsio_hold_token || null,
        selected_seats_json: pricing.selectedSeats || payload.selected_seats || null
      },
      conn
    );
    const bookingId = created.id;
    const checkInCode = created.check_in_code;

    const seatsToBook = Array.isArray(pricing.selectedSeats)
      ? pricing.selectedSeats
      : Array.isArray(payload.selected_seats)
        ? payload.selected_seats
        : [];
    const seatsHoldToken = pricing.seatsioHoldToken || payload.seatsio_hold_token || null;
    if (seatsToBook.length && pricing.event) {
      if (seatsHoldToken) {
        try {
          await seatsioService.bookSeatsForCheckout({
            event: pricing.event,
            holdToken: seatsHoldToken,
            selectedSeats: seatsToBook,
            bookingId
          });
        } catch (seatErr) {
          // Hold often expires while the guest retries the card; payment already succeeded.
          // eslint-disable-next-line no-console
          console.warn(
            "[stripe] seat hold book failed; booking without hold:",
            seatErr?.message || seatErr
          );
          await seatsioService.bookSoldSeatsWithoutHold({
            event: pricing.event,
            selectedSeats: seatsToBook,
            bookingId
          });
        }
      } else {
        await seatsioService.bookSoldSeatsWithoutHold({
          event: pricing.event,
          selectedSeats: seatsToBook,
          bookingId
        });
      }
    }

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

    const stripe = assertStripeConfigured();
    await syncStripePaymentRecord({
      stripe,
      paymentIntentId,
      chargeId: stripeChargeId,
      eventId: payload.event_id,
      bookingId,
      name: pricing.userName,
      email: pricing.userEmail,
      phone: pricing.userPhone
    }).catch(() => {});

    await dispatchBookingEmails({
      bookingId,
      checkInCode,
      payload,
      pricing,
      paymentStatus: "paid",
      guestAccount: guestAccount?.created ? guestAccount : null
    }).catch(() => {});

    return {
      alreadyFulfilled: false,
      ...mapFulfillResult(bookingId, pricing, { checkInCode })
    };
  } catch (err) {
    await conn.rollback();
    // Webhook and client confirm can race; the unique PI index lets only one booking win.
    if (err?.code === "ER_DUP_ENTRY") {
      const winner = await findBookingByPaymentIntentId(paymentIntentId).catch(() => null);
      if (winner) {
        return {
          alreadyFulfilled: true,
          bookingId: winner.id,
          paymentStatus: winner.payment_status
        };
      }
    }
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

/**
 * Guest closed the card form without paying — cancel the open PaymentIntent in Stripe
 * so it does not linger as "Incomplete" in the dashboard.
 */
async function cancelAbandonedPaymentIntent({ paymentIntentId, userId = null, isGuest = false }) {
  const stripe = assertStripeConfigured();
  const id = String(paymentIntentId || "").trim();
  if (!id) {
    throw new ApiError(400, "Payment session is missing.");
  }

  const checkout = await checkoutPaymentModel.findByPaymentIntentId(id);
  if (!checkout) {
    throw new ApiError(404, "Checkout session not found for this payment.");
  }
  if (checkout.status === "succeeded" || checkout.booking_id) {
    return { canceled: false, reason: "already_succeeded", status: checkout.status };
  }

  const checkoutIsGuest = checkout.user_id == null;
  if (isGuest || checkoutIsGuest) {
    if (!checkoutIsGuest) {
      throw new ApiError(403, "This payment is not a guest checkout session.");
    }
  } else if (userId != null && Number(checkout.user_id) !== Number(userId)) {
    throw new ApiError(403, "This payment belongs to another account.");
  }

  let pi;
  try {
    pi = await stripe.paymentIntents.retrieve(id);
  } catch (err) {
    throw new ApiError(502, err?.message || "Could not load payment from Stripe.");
  }

  const fulfillCharged = async (chargedPi) => {
    const chargeId =
      typeof chargedPi.latest_charge === "string"
        ? chargedPi.latest_charge
        : chargedPi.latest_charge?.id || null;
    try {
      const result = await fulfillPaymentIntent({
        paymentIntentId: id,
        userId: checkoutIsGuest ? null : userId,
        stripeChargeId: chargeId
      });
      return result?.bookingId ?? null;
    } catch (fulfillErr) {
      // eslint-disable-next-line no-console
      console.warn("[stripe] fulfill on abandon failed:", id, fulfillErr?.message || fulfillErr);
      return null;
    }
  };

  if (pi.status === "succeeded") {
    const bookingId = await fulfillCharged(pi);
    return { canceled: false, reason: "stripe_succeeded", status: pi.status, bookingId };
  }
  if (pi.status === "processing") {
    return { canceled: false, reason: "processing", status: pi.status };
  }
  if (pi.status === "canceled") {
    await markCheckoutCanceled(id);
    return { canceled: true, reason: "already_canceled", status: pi.status };
  }

  const cancelable = new Set([
    "requires_payment_method",
    "requires_confirmation",
    "requires_action",
    "requires_capture"
  ]);
  if (!cancelable.has(pi.status)) {
    return { canceled: false, reason: "not_cancelable", status: pi.status };
  }

  try {
    pi = await stripe.paymentIntents.cancel(id, {
      cancellation_reason: "abandoned"
    });
  } catch (err) {
    // Race: payment may have succeeded between retrieve and cancel.
    const latest = await stripe.paymentIntents.retrieve(id).catch(() => null);
    if (latest?.status === "succeeded") {
      const bookingId = await fulfillCharged(latest);
      return { canceled: false, reason: "stripe_succeeded", status: "succeeded", bookingId };
    }
    if (latest?.status === "processing") {
      return { canceled: false, reason: "processing", status: "processing" };
    }
    throw new ApiError(502, err?.message || "Could not cancel payment.");
  }

  await markCheckoutCanceled(id);
  return { canceled: true, reason: "canceled", status: pi.status };
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
  let pi = await stripe.paymentIntents.retrieve(paymentIntentId);

  if (isGuest) {
    if (pi.metadata?.guest_checkout !== "1") {
      throw new ApiError(403, "This payment is not a guest checkout session.");
    }
  } else if (Number(pi.metadata?.user_id) !== Number(userId)) {
    throw new ApiError(403, "This payment belongs to another account.");
  }

  if (pi.status === "processing") {
    pi = await waitForPaymentIntentSucceeded(stripe, paymentIntentId);
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
    throw new ApiError(
      409,
      "Payment is still processing. Please wait a moment — this page will confirm your booking automatically."
    );
  }

  if (pi.status === "requires_payment_method" || pi.status === "requires_confirmation") {
    throw new ApiError(402, "Payment was not completed. Please try again.", {
      code: "PAYMENT_NOT_COMPLETED"
    });
  }

  if (pi.status === "canceled") {
    await markCheckoutCanceled(paymentIntentId);
    throw new ApiError(400, "Payment was canceled.", { code: "PAYMENT_NOT_COMPLETED" });
  }

  throw new ApiError(400, `Payment could not be completed (status: ${pi.status}).`, {
    code: "PAYMENT_NOT_COMPLETED"
  });
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
  cancelAbandonedPaymentIntent,
  handleStripeWebhookEvent,
  markCheckoutFailed,
  markCheckoutCanceled
};
