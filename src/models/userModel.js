const { pool } = require("../config/db");

async function findUserByEmail(email) {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [
    email
  ]);
  return rows[0] || null;
}

async function createUser({ name, email, mobileNumber, passwordHash, role }) {
  const [result] = await pool.query(
    `INSERT INTO users (name, email, mobile_number, password_hash, role, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, 1, NOW())`,
    [name, email, mobileNumber || null, passwordHash, role || "user"]
  );
  return result.insertId;
}

async function findUserById(id) {
  const [rows] = await pool.query(
    "SELECT id, name, email, mobile_number, role, is_active, created_at FROM users WHERE id = ? LIMIT 1",
    [id]
  );
  return rows[0] || null;
}

async function listUsersByRole(role) {
  const [rows] = await pool.query(
    `SELECT id, name, email, mobile_number, role, is_active, created_at
     FROM users
     WHERE role = ?
     ORDER BY created_at DESC`,
    [role]
  );
  return rows;
}

async function deactivateUserById(id) {
  const [result] = await pool.query(
    `UPDATE users
     SET is_active = 0, updated_at = NOW()
     WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

module.exports = {
  findUserByEmail,
  createUser,
  findUserById,
  listUsersByRole,
  deactivateUserById
};
