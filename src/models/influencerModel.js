const { pool } = require("../config/db");

async function listInfluencers({ cityId, categoryId, dateStart, dateEnd, monthStart, monthEnd, q, sortBy }) {
  const conditions = ["i.status = 'approved'"];
  const values = [];
  const relevanceValues = [];

  if (cityId) {
    conditions.push("i.city_id = ?");
    values.push(cityId);
  }
  if (categoryId) {
    conditions.push("i.category_id = ?");
    values.push(categoryId);
  }
  if (dateStart && dateEnd) {
    conditions.push("i.created_at >= ? AND i.created_at < ?");
    values.push(dateStart, dateEnd);
  }
  if (monthStart && monthEnd) {
    conditions.push("i.created_at >= ? AND i.created_at < ?");
    values.push(monthStart, monthEnd);
  }
  if (q) {
    conditions.push("(i.name LIKE ? OR i.bio LIKE ?)");
    values.push(`%${q}%`, `%${q}%`);
    relevanceValues.push(`%${q}%`, `%${q}%`);
  }

  let orderBy = "i.followers_count DESC";
  if (sortBy === "newest") {
    orderBy = "i.created_at DESC";
  } else if (sortBy === "relevance" && q) {
    orderBy = "relevance_score DESC, i.followers_count DESC";
  }

  const relevanceSelect = q
    ? `((CASE WHEN i.name LIKE ? THEN 3 ELSE 0 END) +
        (CASE WHEN i.bio LIKE ? THEN 2 ELSE 0 END)) AS relevance_score`
    : "0 AS relevance_score";

  const [rows] = await pool.query(
    `SELECT i.*, c.name AS city_name, cat.name AS category_name, ${relevanceSelect}
     FROM influencers i
     LEFT JOIN cities c ON c.id = i.city_id
     LEFT JOIN categories cat ON cat.id = i.category_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${orderBy}`,
    [...relevanceValues, ...values]
  );
  return rows;
}

async function createInfluencer({
  name,
  bio,
  city_id,
  category_id,
  social_links,
  contact_email,
  profile_image_url,
  created_by
}) {
  const socialLinksValue = social_links ? JSON.stringify(social_links) : null;
  const [result] = await pool.query(
    `INSERT INTO influencers
      (name, bio, city_id, category_id, social_links, contact_email, profile_image_url, followers_count, is_verified, status, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, 0, 'pending', ?, NOW(), NOW())`,
    [name, bio || null, city_id, category_id, socialLinksValue, contact_email || null, profile_image_url || null, created_by]
  );
  return result.insertId;
}

async function listInfluencersByCreator(createdBy) {
  try {
    const [rows] = await pool.query(
      `SELECT
         i.id,
         i.name,
         i.bio,
         i.status,
         i.review_note,
         i.city_id,
         i.category_id,
         i.contact_email,
         i.profile_image_url,
         i.social_links,
         i.created_at,
         i.updated_at,
         c.name AS city_name,
         cat.name AS category_name
       FROM influencers i
       LEFT JOIN cities c ON c.id = i.city_id
       LEFT JOIN categories cat ON cat.id = i.category_id
       WHERE i.created_by = ?
       ORDER BY i.created_at DESC`,
      [createdBy]
    );
    return rows;
  } catch (err) {
    if (err?.code !== "ER_BAD_FIELD_ERROR") {
      throw err;
    }
    const [rows] = await pool.query(
      `SELECT
         i.id,
         i.name,
         i.bio,
         i.status,
         NULL AS review_note,
         i.city_id,
         i.category_id,
         i.contact_email,
         i.profile_image_url,
         i.social_links,
         i.created_at,
         i.updated_at,
         c.name AS city_name,
         cat.name AS category_name
       FROM influencers i
       LEFT JOIN cities c ON c.id = i.city_id
       LEFT JOIN categories cat ON cat.id = i.category_id
       WHERE i.created_by = ?
       ORDER BY i.created_at DESC`,
      [createdBy]
    );
    return rows;
  }
}

async function findPendingInfluencerByCreator(createdBy) {
  const [rows] = await pool.query(
    `SELECT id, status
     FROM influencers
     WHERE created_by = ? AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 1`,
    [createdBy]
  );
  return rows[0] || null;
}

async function findAnyInfluencerByCreator(createdBy) {
  const [rows] = await pool.query(
    `SELECT id, status
     FROM influencers
     WHERE created_by = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [createdBy]
  );
  return rows[0] || null;
}

async function findInfluencerById(id) {
  const [rows] = await pool.query(
    `SELECT *
     FROM influencers
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function updateInfluencerByCreator({ id, createdBy, payload }) {
  const allowed = ["name", "bio", "city_id", "category_id", "social_links", "contact_email", "profile_image_url"];
  const entries = Object.entries(payload).filter(([key, value]) => allowed.includes(key) && value !== undefined);
  if (!entries.length) {
    return false;
  }
  const mapped = entries.map(([key, value]) => (key === "social_links" && value ? [key, JSON.stringify(value)] : [key, value]));
  const setClause = mapped.map(([key]) => `${key} = ?`).join(", ");
  const values = mapped.map(([, value]) => value);
  try {
    const [result] = await pool.query(
      `UPDATE influencers
       SET ${setClause}, status = 'pending', review_note = NULL, updated_at = NOW()
       WHERE id = ? AND created_by = ?`,
      [...values, id, createdBy]
    );
    return result.affectedRows > 0;
  } catch (err) {
    if (err?.code !== "ER_BAD_FIELD_ERROR") {
      throw err;
    }
    const [result] = await pool.query(
      `UPDATE influencers
       SET ${setClause}, status = 'pending', updated_at = NOW()
       WHERE id = ? AND created_by = ?`,
      [...values, id, createdBy]
    );
    return result.affectedRows > 0;
  }
}

module.exports = {
  listInfluencers,
  createInfluencer,
  listInfluencersByCreator,
  findPendingInfluencerByCreator,
  findAnyInfluencerByCreator,
  findInfluencerById,
  updateInfluencerByCreator
};
