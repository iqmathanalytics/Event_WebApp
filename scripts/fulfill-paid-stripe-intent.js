/**
 * Recover a booking when Stripe charged the customer (card, Apple Pay, Google Pay, Amazon Pay)
 * but confirm/webhook did not create the booking.
 *
 *   node scripts/fulfill-paid-stripe-intent.js pi_xxxxxxxx
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const { getStripe } = require("../src/config/stripe");
const stripePaymentService = require("../src/services/stripePaymentService");

async function main() {
  const paymentIntentId = process.argv[2];
  if (!paymentIntentId || !paymentIntentId.startsWith("pi_")) {
    console.error("Usage: node scripts/fulfill-paid-stripe-intent.js pi_xxxxxxxx");
    process.exit(1);
  }

  const stripe = getStripe();
  if (!stripe) {
    console.error("STRIPE_SECRET_KEY missing in .env");
    process.exit(1);
  }

  const pi = await stripe.paymentIntents.retrieve(paymentIntentId);
  if (pi.status !== "succeeded") {
    console.error(`PaymentIntent status is "${pi.status}", not succeeded.`);
    process.exit(1);
  }

  const chargeId =
    typeof pi.latest_charge === "string" ? pi.latest_charge : pi.latest_charge?.id || null;

  const result = await stripePaymentService.fulfillPaymentIntent({
    paymentIntentId,
    stripeChargeId: chargeId
  });

  console.log(result.alreadyFulfilled ? "Already fulfilled:" : "Booking created:");
  console.log(JSON.stringify(result, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
