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
  await runner.query(
    `UPDATE event_checkout_payments
     SET status = ?,
         booking_id = COALESCE(?, booking_id),
         stripe_charge_id = COALESCE(?, stripe_charge_id),
         failure_code = COALESCE(?, failure_code),
         failure_message = COALESCE(?, failure_message),
         updated_at = NOW()
     WHERE stripe_payment_intent_id = ?`,
    [
      status,
      booking_id ?? null,
      stripe_charge_id ?? null,
      failure_code ?? null,
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
