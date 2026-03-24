const { pool } = require("../config/db");

async function createDealerProfile(payload) {
  const [result] = await pool.query(
    `INSERT INTO dealer_profiles
      (created_by, name, business_email, business_mobile, location_text, city_id, category_id, bio, website_or_social_link, profile_image_url, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`,
    [
      payload.created_by,
      payload.name,
      payload.business_email,
      payload.business_mobile,
      payload.location_text,
      payload.city_id || null,
      payload.category_id,
      payload.bio || null,
      payload.website_or_social_link || null,
      payload.profile_image_url || null
    ]
  );
  return result.insertId;
}

async function findLatestDealerProfileByCreator(createdBy) {
  const [rows] = await pool.query(
    `SELECT *
     FROM dealer_profiles
     WHERE created_by = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [createdBy]
  );
  return rows[0] || null;
}

async function findApprovedDealerProfileByCreator(createdBy) {
  const [rows] = await pool.query(
    `SELECT *
     FROM dealer_profiles
     WHERE created_by = ? AND status = 'approved'
     ORDER BY created_at DESC
     LIMIT 1`,
    [createdBy]
  );
  return rows[0] || null;
}

async function updateDealerProfileByCreator({ id, createdBy, payload }) {
  const [result] = await pool.query(
    `UPDATE dealer_profiles
     SET name = ?,
         business_email = ?,
         business_mobile = ?,
         location_text = ?,
         city_id = ?,
         category_id = ?,
         bio = ?,
         website_or_social_link = ?,
         profile_image_url = ?,
         status = 'pending',
         review_note = NULL,
         updated_at = NOW()
     WHERE id = ? AND created_by = ?`,
    [
      payload.name,
      payload.business_email,
      payload.business_mobile,
      payload.location_text,
      payload.city_id || null,
      payload.category_id,
      payload.bio || null,
      payload.website_or_social_link || null,
      payload.profile_image_url || null,
      id,
      createdBy
    ]
  );
  return result.affectedRows > 0;
}

module.exports = {
  createDealerProfile,
  findLatestDealerProfileByCreator,
  findApprovedDealerProfileByCreator,
  updateDealerProfileByCreator
};
