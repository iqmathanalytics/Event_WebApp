const { pool } = require("../config/db");

async function createContactMessage({ name, email, subject, message, cityId }) {
  const [result] = await pool.query(
    `INSERT INTO contact_messages (name, email, subject, message, city_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'new', NOW())`,
    [name, email, subject, message, cityId || null]
  );
  return result.insertId;
}

async function listMessagesPaginated({ offset, limit }) {
  const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM contact_messages`);
  const [rows] = await pool.query(
    `SELECT id, name, email, subject, message, city_id, status, created_at, resolved_at
     FROM contact_messages
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`,
    [limit, offset]
  );
  return { rows, total: Number(total) };
}

async function getAllMessagesForExport() {
  const [rows] = await pool.query(
    `SELECT id, name, email, subject, message, city_id, status, created_at, resolved_at
     FROM contact_messages
     ORDER BY created_at DESC`
  );
  return rows;
}

module.exports = { createContactMessage, listMessagesPaginated, getAllMessagesForExport };
