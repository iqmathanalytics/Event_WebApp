const { pool } = require("../config/db");

async function createCheckoutPayment(row, conn) {
  const runner = conn || pool;
  const [result] = await runner.query(
    `INSERT INTO event_checkout_payments
      (stripe_payment_intent_id, user_id, event_id, status, amount_cents, currency, payload_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      row.stripe_payment_intent_id,
      row.user_id,
      row.event_id,
      row.status || "requires_payment",
      row.amount_cents,
      row.currency || "usd",
      row.payload_json
    ]
  );
  return result.insertId;
}

async function findByPaymentIntentId(paymentIntentId, conn) {
  const runner = conn || pool;
  const [rows] = await runner.query(
    `SELECT * FROM event_checkout_payments WHERE stripe_payment_intent_id = ? LIMIT 1`,
    [paymentIntentId]
  );
  return rows[0] || null;
}

/**
 * Recent succeeded checkouts for the same buyer + event + amount (duplicate-charge guard).
 */
async function findRecentSucceededCheckouts({
  eventId,
  userId = null,
  email = null,
  amountCents = null,
  withinMinutes = 45,
  conn
}) {
  const runner = conn || pool;
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  const minutes = Math.max(1, Math.min(24 * 60, Number(withinMinutes) || 45));
  const amount = amountCents == null ? null : Number(amountCents);
  const [rows] = await runner.query(
    `SELECT id, stripe_payment_intent_id, booking_id, user_id, event_id, status, amount_cents, payload_json, updated_at
     FROM event_checkout_payments
     WHERE event_id = ?
       AND status = 'succeeded'
       AND (? IS NULL OR amount_cents = ?)
       AND updated_at >= (NOW() - INTERVAL ? MINUTE)
       AND (
         (? IS NOT NULL AND user_id = ?)
         OR (
           ? <> ''
           AND LOWER(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.email')), ''))) = ?
         )
       )
     ORDER BY updated_at DESC
     LIMIT 10`,
    [
      eventId,
      amount,
      amount,
      minutes,
      userId,
      userId,
      normalizedEmail,
      normalizedEmail
    ]
  );
  return rows || [];
}

/** Open (unpaid) checkouts for the same buyer + event — cancel before starting a new PI. */
async function findOpenCheckoutsForBuyer({ eventId, userId = null, email = null, conn }) {
  const runner = conn || pool;
  const normalizedEmail = String(email || "")
    .trim()
    .toLowerCase();
  const [rows] = await runner.query(
    `SELECT id, stripe_payment_intent_id, user_id, event_id, status, amount_cents, payload_json, created_at
     FROM event_checkout_payments
     WHERE event_id = ?
       AND status IN ('requires_payment', 'failed')
       AND created_at >= (NOW() - INTERVAL 6 HOUR)
       AND (
         (? IS NOT NULL AND user_id = ?)
         OR (
           ? <> ''
           AND LOWER(TRIM(COALESCE(JSON_UNQUOTE(JSON_EXTRACT(payload_json, '$.email')), ''))) = ?
         )
       )
     ORDER BY created_at DESC
     LIMIT 20`,
    [eventId, userId, userId, normalizedEmail, normalizedEmail]
  );
  return rows || [];
}

async function updateCheckoutStatus(
  paymentIntentId,
  { status, booking_id, stripe_charge_id, failure_code, failure_message },
  conn
) {
  const runner = conn || pool;
  const nextStatus = status;
  // Succeeded payments clear prior failure markers (e.g. invalid_cvc then card succeeded).
  const clearFailures = nextStatus === "succeeded";
  await runner.query(
    `UPDATE event_checkout_payments
     SET status = ?,
         booking_id = COALESCE(?, booking_id),
         stripe_charge_id = COALESCE(?, stripe_charge_id),
         failure_code = CASE
           WHEN ? THEN NULL
           ELSE COALESCE(?, failure_code)
         END,
         failure_message = CASE
           WHEN ? THEN NULL
           ELSE COALESCE(?, failure_message)
         END,
         updated_at = NOW()
     WHERE stripe_payment_intent_id = ?`,
    [
      nextStatus,
      booking_id ?? null,
      stripe_charge_id ?? null,
      clearFailures ? 1 : 0,
      failure_code ?? null,
      clearFailures ? 1 : 0,
      failure_message ?? null,
      paymentIntentId
    ]
  );
}

module.exports = {
  createCheckoutPayment,
  findByPaymentIntentId,
  findRecentSucceededCheckouts,
  findOpenCheckoutsForBuyer,
  updateCheckoutStatus
};
