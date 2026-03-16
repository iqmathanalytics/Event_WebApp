const { pool } = require("../config/db");

async function subscribeNewsletter({ email, cityId }) {
  const [result] = await pool.query(
    `INSERT INTO newsletter_subscribers (email, city_id, is_active, subscribed_at, created_at)
     VALUES (?, ?, 1, NOW(), NOW())
     ON DUPLICATE KEY UPDATE is_active = 1, unsubscribed_at = NULL`,
    [email, cityId || null]
  );
  return result.affectedRows > 0;
}

module.exports = { subscribeNewsletter };
