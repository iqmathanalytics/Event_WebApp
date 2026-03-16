const { pool } = require("../config/db");

async function createContactMessage({ name, email, subject, message, cityId }) {
  const [result] = await pool.query(
    `INSERT INTO contact_messages (name, email, subject, message, city_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, 'new', NOW())`,
    [name, email, subject, message, cityId || null]
  );
  return result.insertId;
}

module.exports = { createContactMessage };
