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

async function getActiveSubscription({ email, cityId }) {
  const [rows] = await pool.query(
    `SELECT id, email, city_id, is_active, subscribed_at
     FROM newsletter_subscribers
     WHERE email = ? AND ((city_id IS NULL AND ? IS NULL) OR city_id = ?)
     LIMIT 1`,
    [email, cityId || null, cityId || null]
  );
  return rows[0] || null;
}

async function listSubscribersPaginated({ offset, limit }) {
  const [[{ total }]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM newsletter_subscribers ns
     INNER JOIN users u ON u.email = ns.email`
  );
  const [rows] = await pool.query(
    `SELECT ns.id, ns.email, COALESCE(uop.city_id, ns.city_id) AS city_id, ns.is_active, ns.subscribed_at,
            c.name AS city_name, c.state AS city_state,
            uop.first_name, uop.last_name, uop.mobile_number, uop.interests_json,
            uop.wants_influencer, uop.wants_deal
     FROM newsletter_subscribers ns
     INNER JOIN users u ON u.email = ns.email
     LEFT JOIN user_onboarding_profiles uop ON uop.user_id = u.id
     LEFT JOIN cities c ON c.id = COALESCE(uop.city_id, ns.city_id)
     ORDER BY ns.subscribed_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return { rows, total: Number(total) };
}

async function getAllSubscribersForExport() {
  const [rows] = await pool.query(
    `SELECT ns.id, ns.email, COALESCE(uop.city_id, ns.city_id) AS city_id, ns.is_active, ns.subscribed_at,
            c.name AS city_name, c.state AS city_state,
            uop.first_name, uop.last_name, uop.mobile_number, uop.interests_json,
            uop.wants_influencer, uop.wants_deal
     FROM newsletter_subscribers ns
     INNER JOIN users u ON u.email = ns.email
     LEFT JOIN user_onboarding_profiles uop ON uop.user_id = u.id
     LEFT JOIN cities c ON c.id = COALESCE(uop.city_id, ns.city_id)
     ORDER BY ns.subscribed_at DESC`
  );
  return rows;
}

async function syncSubscriberEmail({ oldEmail, newEmail }) {
  if (!oldEmail || !newEmail || String(oldEmail).toLowerCase() === String(newEmail).toLowerCase()) {
    return false;
  }
  const [result] = await pool.query(
    `UPDATE newsletter_subscribers
     SET email = ?
     WHERE email = ?`,
    [String(newEmail).toLowerCase(), String(oldEmail).toLowerCase()]
  );
  return result.affectedRows > 0;
}

async function deleteSubscriberByEmail(email) {
  if (!email) {
    return false;
  }
  const [result] = await pool.query(
    `DELETE FROM newsletter_subscribers
     WHERE email = ?`,
    [String(email).toLowerCase()]
  );
  return result.affectedRows > 0;
}

async function getSubscriberSyncProfile({ email, fallbackCityId = null }) {
  const [rows] = await pool.query(
    `SELECT u.name AS user_name, u.email,
            uop.first_name, uop.last_name, uop.mobile_number, uop.city_id AS onboarding_city_id,
            c1.name AS onboarding_city_name,
            c2.name AS fallback_city_name
     FROM users u
     LEFT JOIN user_onboarding_profiles uop ON uop.user_id = u.id
     LEFT JOIN cities c1 ON c1.id = uop.city_id
     LEFT JOIN cities c2 ON c2.id = ?
     WHERE u.email = ?
     LIMIT 1`,
    [fallbackCityId, email]
  );
  return rows[0] || null;
}

module.exports = {
  subscribeNewsletter,
  getActiveSubscription,
  listSubscribersPaginated,
  getAllSubscribersForExport,
  syncSubscriberEmail,
  deleteSubscriberByEmail,
  getSubscriberSyncProfile
};
