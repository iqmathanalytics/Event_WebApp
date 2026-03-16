const { pool } = require("../config/db");

async function listServices({
  cityId,
  categoryId,
  dateStart,
  dateEnd,
  monthStart,
  monthEnd,
  priceMin,
  priceMax,
  q,
  sortBy,
  sortOrder
}) {
  const conditions = ["s.status = 'approved'"];
  const values = [];
  const relevanceValues = [];

  if (cityId) {
    conditions.push("s.city_id = ?");
    values.push(cityId);
  }
  if (categoryId) {
    conditions.push("s.category_id = ?");
    values.push(categoryId);
  }
  if (dateStart && dateEnd) {
    conditions.push("s.created_at >= ? AND s.created_at < ?");
    values.push(dateStart, dateEnd);
  }
  if (monthStart && monthEnd) {
    conditions.push("s.created_at >= ? AND s.created_at < ?");
    values.push(monthStart, monthEnd);
  }
  if (priceMin !== null) {
    conditions.push("COALESCE(s.price_min, 0) >= ?");
    values.push(priceMin);
  }
  if (priceMax !== null) {
    conditions.push("COALESCE(s.price_min, 0) <= ?");
    values.push(priceMax);
  }
  if (q) {
    conditions.push("(s.title LIKE ? OR s.description LIKE ?)");
    values.push(`%${q}%`, `%${q}%`);
    relevanceValues.push(`%${q}%`, `%${q}%`);
  }

  const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";
  let orderBy = "s.popularity_score DESC";
  if (sortBy === "price") {
    orderBy = `COALESCE(s.price_min, 0) ${safeSortOrder}`;
  } else if (sortBy === "newest") {
    orderBy = "s.created_at DESC";
  } else if (sortBy === "relevance" && q) {
    orderBy = "relevance_score DESC, s.popularity_score DESC";
  }

  const relevanceSelect = q
    ? `((CASE WHEN s.title LIKE ? THEN 3 ELSE 0 END) +
        (CASE WHEN s.description LIKE ? THEN 2 ELSE 0 END)) AS relevance_score`
    : "0 AS relevance_score";

  const [rows] = await pool.query(
    `SELECT s.*, c.name AS city_name, cat.name AS category_name, ${relevanceSelect}
     FROM services s
     LEFT JOIN cities c ON c.id = s.city_id
     LEFT JOIN categories cat ON cat.id = s.category_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${orderBy}`,
    [...relevanceValues, ...values]
  );
  return rows;
}

module.exports = { listServices };
