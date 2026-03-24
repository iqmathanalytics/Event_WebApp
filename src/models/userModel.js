const { pool } = require("../config/db");

async function createUser({
  name,
  email,
  mobileNumber,
  passwordHash,
  role,
  organizerEnabled,
  canPostEvents,
  canCreateInfluencerProfile,
  canPostDeals
}) {
  const enabled =
    organizerEnabled !== undefined ? Boolean(organizerEnabled) : String(role) === "organizer";
  const canEvents = canPostEvents !== undefined ? Boolean(canPostEvents) : true;
  const canInfluencer =
    canCreateInfluencerProfile !== undefined ? Boolean(canCreateInfluencerProfile) : true;
  const canDeals = canPostDeals !== undefined ? Boolean(canPostDeals) : true;
  const [result] = await pool.query(
    `INSERT INTO users
      (name, email, mobile_number, password_hash, role, organizer_enabled, can_post_events, can_create_influencer_profile, can_post_deals, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW())`,
    [
      name,
      email,
      mobileNumber || null,
      passwordHash,
      role || "user",
      enabled ? 1 : 0,
      canEvents ? 1 : 0,
      canInfluencer ? 1 : 0,
      canDeals ? 1 : 0
    ]
  );
  return result.insertId;
}

async function findUserById(id) {
  const [rows] = await pool.query(
    `SELECT id, name, email, mobile_number, role, organizer_enabled, can_post_events, can_create_influencer_profile,
            can_post_deals, is_active, created_at
     FROM users
     WHERE id = ? LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findUserByEmail(email) {
  const [rows] = await pool.query("SELECT * FROM users WHERE email = ? LIMIT 1", [
    email
  ]);
  return rows[0] || null;
}

async function listUsersByRole(role) {
  const [rows] = await pool.query(
    `SELECT id, name, email, mobile_number, role, organizer_enabled, can_post_events, can_create_influencer_profile,
            can_post_deals, is_active, created_at
     FROM users
     WHERE role = ?
     ORDER BY created_at DESC`,
    [role]
  );
  return rows;
}

async function listUsersByOrganizerEnabled() {
  const [rows] = await pool.query(
    `SELECT id, name, email, mobile_number, role, organizer_enabled, can_post_events, can_create_influencer_profile,
            can_post_deals, is_active, created_at
     FROM users
     WHERE organizer_enabled = 1
     ORDER BY created_at DESC`
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

async function activateUserById(id) {
  const [result] = await pool.query(
    `UPDATE users
     SET is_active = 1, updated_at = NOW()
     WHERE id = ?`,
    [id]
  );
  return result.affectedRows > 0;
}

async function enableOrganizerById(id) {
  const [result] = await pool.query(
    `UPDATE users
     SET organizer_enabled = 1, updated_at = NOW()
     WHERE id = ? AND is_active = 1`,
    [id]
  );
  return result.affectedRows > 0;
}

async function updateUserCapabilitiesById({
  id,
  can_post_events,
  can_create_influencer_profile,
  can_post_deals
}) {
  const [result] = await pool.query(
    `UPDATE users
     SET can_post_events = ?, can_create_influencer_profile = ?, can_post_deals = ?, updated_at = NOW()
     WHERE id = ?`,
    [can_post_events ? 1 : 0, can_create_influencer_profile ? 1 : 0, can_post_deals ? 1 : 0, id]
  );
  return result.affectedRows > 0;
}

async function updateUserProfileById({ id, name, email, mobile_number }) {
  const [result] = await pool.query(
    `UPDATE users
     SET name = ?, email = ?, mobile_number = ?, updated_at = NOW()
     WHERE id = ?`,
    [name, email, mobile_number || null, id]
  );
  return result.affectedRows > 0;
}

async function listAllUsers() {
  const [rows] = await pool.query(
    `SELECT id, name, email, mobile_number, role, organizer_enabled, can_post_events, can_create_influencer_profile,
            can_post_deals, is_active, created_at
     FROM users
     ORDER BY created_at DESC`
  );
  return rows;
}

async function deleteUserById(id) {
  const [result] = await pool.query("DELETE FROM users WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

module.exports = {
  findUserByEmail,
  createUser,
  findUserById,
  listUsersByRole,
  listUsersByOrganizerEnabled,
  enableOrganizerById,
  updateUserCapabilitiesById,
  deactivateUserById,
  activateUserById,
  updateUserProfileById,
  listAllUsers,
  deleteUserById
};
