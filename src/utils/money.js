const STRIPE_USD_MIN_CENTS = 50;

function dollarsToCents(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n) || n < 0) {
    return 0;
  }
  return Math.round(n * 100);
}

function centsToDollars(cents) {
  return Number((Number(cents) / 100).toFixed(2));
}

/** Stripe USD requires at least $0.50; smaller positive totals use the free-booking path. */
function requiresStripePayment(totalAmount) {
  return dollarsToCents(totalAmount) >= STRIPE_USD_MIN_CENTS;
}

module.exports = {
  STRIPE_USD_MIN_CENTS,
  dollarsToCents,
  centsToDollars,
  requiresStripePayment
};
