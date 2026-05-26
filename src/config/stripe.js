const Stripe = require("stripe");
const ApiError = require("../utils/ApiError");

let stripeClient = null;

function getStripe() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return null;
  }
  if (!stripeClient) {
    stripeClient = new Stripe(secretKey);
  }
  return stripeClient;
}

function assertStripeConfigured() {
  if (!getStripe()) {
    throw new ApiError(
      503,
      "Card payments are not configured on the server. Contact support or try again later."
    );
  }
  return getStripe();
}

module.exports = {
  getStripe,
  assertStripeConfigured,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || "",
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || ""
};
