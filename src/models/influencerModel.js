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

module.exports = { listInfluencers };
