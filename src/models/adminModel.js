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

async function listAdminNotifications({ adminId, limit = 25 }) {
  const [rows] = await pool.query(
    `SELECT id, type, entity_type, entity_id, title, message, is_read, created_at
     FROM admin_notifications
     WHERE target_admin_id IS NULL OR target_admin_id = ?
     ORDER BY created_at DESC
     LIMIT ?`,
    [adminId, Number(limit)]
  );
  return rows;
}

async function countUnreadAdminNotifications({ adminId }) {
  const [[row]] = await pool.query(
    `SELECT COUNT(*) AS total
     FROM admin_notifications
     WHERE (target_admin_id IS NULL OR target_admin_id = ?) AND is_read = 0`,
    [adminId]
  );
  return Number(row?.total || 0);
}

async function markAllAdminNotificationsRead({ adminId }) {
  const [result] = await pool.query(
    `UPDATE admin_notifications
     SET is_read = 1
     WHERE (target_admin_id IS NULL OR target_admin_id = ?) AND is_read = 0`,
    [adminId]
  );
  return result.affectedRows;
}

async function purgeReadNotificationsOlderThan({ adminId, minutes = 5 }) {
  const [result] = await pool.query(
    `DELETE FROM admin_notifications
     WHERE (target_admin_id IS NULL OR target_admin_id = ?)
       AND is_read = 1
       AND created_at < (NOW() - INTERVAL ? MINUTE)`,
    [adminId, Number(minutes)]
  );
  return result.affectedRows;
}

async function deleteAdminNotificationById({ adminId, notificationId }) {
  const [result] = await pool.query(
    `DELETE FROM admin_notifications
     WHERE id = ? AND (target_admin_id IS NULL OR target_admin_id = ?)`,
    [notificationId, adminId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  createAdminNotification,
  getAnalyticsCounts,
  listAdminNotifications,
  countUnreadAdminNotifications,
  markAllAdminNotificationsRead,
  purgeReadNotificationsOlderThan,
  deleteAdminNotificationById
};
