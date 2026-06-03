const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Wallet payments (Apple Pay, Google Pay, Amazon Pay) often redirect or stay "processing"
 * for a few seconds before Stripe marks the PaymentIntent succeeded.
 */
export async function confirmBookingPaymentWithRetry(confirmFn, paymentIntentId, options = {}) {
  const { attempts = 10, delayMs = 1500 } = options;
  let lastError = null;

  for (let i = 0; i < attempts; i += 1) {
    try {
      return await confirmFn(paymentIntentId);
    } catch (err) {
      lastError = err;
      const status = err?.response?.status;
      const retryable = status === 409 || status === 402 || status === 503;
      if (!retryable || i === attempts - 1) {
        throw err;
      }
      await sleep(delayMs);
    }
  }

  throw lastError;
}
