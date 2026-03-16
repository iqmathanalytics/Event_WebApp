const { pool } = require("../config/db");

async function listDeals({
  cityId,
  categoryId,
  includePremium,
  onlyActive,
  date,
  monthStart,
  monthEnd,
  priceMin,
  priceMax,
  q,
  sortBy,
  sortOrder
}) {
  const conditions = ["d.status = 'approved'"];
  const values = [];
  const relevanceValues = [];

  if (!includePremium) {
    conditions.push("d.is_premium = 0");
  }
  if (cityId) {
    conditions.push("d.city_id = ?");
    values.push(cityId);
  }
  if (categoryId) {
    conditions.push("d.category_id = ?");
    values.push(categoryId);
  }
  if (date) {
    conditions.push("d.expiry_date = ?");
    values.push(date);
  }
  if (monthStart && monthEnd) {
    conditions.push("d.expiry_date >= ? AND d.expiry_date < ?");
    values.push(monthStart, monthEnd);
  }
  if (priceMin !== null) {
    conditions.push("COALESCE(d.discounted_price, d.original_price, 0) >= ?");
    values.push(priceMin);
  }
  if (priceMax !== null) {
    conditions.push("COALESCE(d.discounted_price, d.original_price, 0) <= ?");
    values.push(priceMax);
  }
  if (q) {
    conditions.push("(d.title LIKE ? OR d.description LIKE ?)");
    values.push(`%${q}%`, `%${q}%`);
    relevanceValues.push(`%${q}%`, `%${q}%`);
  }
  if (onlyActive) {
    conditions.push("d.expiry_date >= CURDATE()");
  }

  const safeSortOrder = sortOrder === "asc" ? "ASC" : "DESC";
  let orderBy = "d.created_at DESC";
  if (sortBy === "price") {
    orderBy = `COALESCE(d.discounted_price, d.original_price, 0) ${safeSortOrder}`;
  } else if (sortBy === "popularity") {
    orderBy = `d.popularity_score ${safeSortOrder}`;
  } else if (sortBy === "newest") {
    orderBy = "d.created_at DESC";
  } else if (sortBy === "relevance" && q) {
    orderBy = "relevance_score DESC, d.popularity_score DESC";
  }

  const relevanceSelect = q
    ? `((CASE WHEN d.title LIKE ? THEN 3 ELSE 0 END) +
        (CASE WHEN d.description LIKE ? THEN 2 ELSE 0 END)) AS relevance_score`
    : "0 AS relevance_score";

  const [rows] = await pool.query(
    `SELECT d.*, c.name AS city_name, cat.name AS category_name, ${relevanceSelect}
     FROM deals d
     LEFT JOIN cities c ON c.id = d.city_id
     LEFT JOIN categories cat ON cat.id = d.category_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY ${orderBy}`,
    [...relevanceValues, ...values]
  );
  return rows;
}

module.exports = { listDeals };
