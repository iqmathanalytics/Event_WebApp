const { pool } = require("../config/db");

async function createPlatformTicketAccessRequest({
  userId,
  name,
  email,
  mobileNumber,
  organizationName,
  message
}) {
  const [result] = await pool.query(
    `INSERT INTO platform_ticket_access_requests
      (user_id, name, email, mobile_number, organization_name, message, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
    [userId, name, email, mobileNumber || null, organizationName || null, message]
  );
  return result.insertId;
}

async function findPendingRequestByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT id, user_id, name, email, mobile_number, organization_name, message, status, admin_note,
            reviewed_by, reviewed_at, created_at
     FROM platform_ticket_access_requests
     WHERE user_id = ? AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function findLatestRequestByUserId(userId) {
  const [rows] = await pool.query(
    `SELECT id, user_id, name, email, mobile_number, organization_name, message, status, admin_note,
            reviewed_by, reviewed_at, created_at
     FROM platform_ticket_access_requests
     WHERE user_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function findRequestById(id) {
  const [rows] = await pool.query(
    `SELECT r.id, r.user_id, r.name, r.email, r.mobile_number, r.organization_name, r.message,
            r.status, r.admin_note, r.reviewed_by, r.reviewed_at, r.created_at,
            u.can_sell_platform_tickets
     FROM platform_ticket_access_requests r
     INNER JOIN users u ON u.id = r.user_id
     WHERE r.id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function listPlatformTicketAccessRequests({ status } = {}) {
  const conditions = [];
  const values = [];
  if (status) {
    conditions.push("r.status = ?");
    values.push(status);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const [rows] = await pool.query(
    `SELECT r.id, r.user_id, r.name, r.email, r.mobile_number, r.organization_name, r.message,
            r.status, r.admin_note, r.reviewed_by, r.reviewed_at, r.created_at,
            u.organizer_enabled, u.can_sell_platform_tickets
     FROM platform_ticket_access_requests r
     INNER JOIN users u ON u.id = r.user_id
     ${where}
     ORDER BY FIELD(r.status, 'pending', 'approved', 'rejected'), r.created_at DESC`,
    values
  );
  return rows;
}

async function updateRequestStatus({ id, status, adminId, adminNote }) {
  const [result] = await pool.query(
    `UPDATE platform_ticket_access_requests
     SET status = ?, admin_note = ?, reviewed_by = ?, reviewed_at = NOW(), updated_at = NOW()
     WHERE id = ? AND status = 'pending'`,
    [status, adminNote || null, adminId, id]
  );
  return result.affectedRows > 0;
}

module.exports = {
  createPlatformTicketAccessRequest,
  findPendingRequestByUserId,
  findLatestRequestByUserId,
  findRequestById,
  listPlatformTicketAccessRequests,
  updateRequestStatus
};
