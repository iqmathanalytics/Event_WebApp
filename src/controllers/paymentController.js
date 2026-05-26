const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const { webhookSecret } = require("../config/stripe");
const stripePaymentService = require("../services/stripePaymentService");
const bookingService = require("../services/bookingService");
const { getStripe } = require("../config/stripe");

const createPaymentIntent = asyncHandler(async (req, res) => {
  const data = await stripePaymentService.createPaymentIntentForBooking({
    userId: req.user.id,
    payload: req.validated.body
  });
  res.status(200).json({
    success: true,
    data
  });
});

const confirmPayment = asyncHandler(async (req, res) => {
  const { payment_intent_id } = req.validated.body;
  const result = await stripePaymentService.confirmPaymentForUser({
    userId: req.user.id,
    paymentIntentId: payment_intent_id
  });
  res.status(200).json({
    success: true,
    message: "Payment confirmed and booking saved",
    data: result
  });
});

const createBookingCheckout = asyncHandler(async (req, res) => {
  const data = await bookingService.createEventBooking({
    userId: req.user.id,
    payload: req.validated.body
  });
  res.status(201).json({
    success: true,
    message: "Booking created successfully",
    data: { ...data, requiresPayment: false }
  });
});

const stripeWebhook = asyncHandler(async (req, res) => {
  const stripe = getStripe();
  if (!stripe || !webhookSecret) {
    return res.status(503).send("Stripe webhook not configured");
  }

  const signature = req.headers["stripe-signature"];
  if (!signature) {
    return res.status(400).send("Missing Stripe signature");
  }

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, webhookSecret);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    await stripePaymentService.handleStripeWebhookEvent(event);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("Stripe webhook handler error:", err.message);
    return res.status(500).json({ received: false });
  }

  res.status(200).json({ received: true });
});

module.exports = {
  createPaymentIntent,
  confirmPayment,
  createBookingCheckout,
  stripeWebhook
};
