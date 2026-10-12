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
  updateCheckoutStatus
};
