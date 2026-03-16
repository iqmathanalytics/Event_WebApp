const { pool } = require("../config/db");

async function createAdminNotification({
  targetAdminId = null,
  type,
  entityType,
  entityId,
  title,
  message
}) {
  const [result] = await pool.query(
    `INSERT INTO admin_notifications
      (target_admin_id, type, entity_type, entity_id, title, message, is_read, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 0, NOW())`,
    [targetAdminId, type, entityType, entityId || null, title, message || null]
  );
  return result.insertId;
}

async function getAnalyticsCounts() {
  const [[users]] = await pool.query("SELECT COUNT(*) AS total_users FROM users");
  const [[events]] = await pool.query("SELECT COUNT(*) AS total_events FROM events");
  const [[pendingEvents]] = await pool.query(
    "SELECT COUNT(*) AS pending_events FROM events WHERE status = 'pending'"
  );
  const [[deals]] = await pool.query("SELECT COUNT(*) AS total_deals FROM deals");
  const [[services]] = await pool.query("SELECT COUNT(*) AS total_services FROM services");
  const [[influencers]] = await pool.query(
    "SELECT COUNT(*) AS total_influencers FROM influencers"
  );

  return {
    ...users,
    ...events,
    ...pendingEvents,
    ...deals,
    ...services,
    ...influencers
  };
}

module.exports = {
  createAdminNotification,
  getAnalyticsCounts
};
