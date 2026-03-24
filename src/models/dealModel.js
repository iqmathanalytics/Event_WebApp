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

  // Guests can still see premium deals, but the UI will lock them with an overlay.
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

  // Only add computed recent_engagement_score — do not re-alias click_count/view_count (d.* already
  // includes them). Duplicate column names can make mysql2 overwrite real counts with zeros in fallbacks.
  const trendingSelect = `(CASE WHEN d.updated_at >= (NOW() - INTERVAL 14 DAY) THEN (COALESCE(d.click_count, 0) + (COALESCE(d.view_count, 0) * 2)) ELSE 0 END) AS recent_engagement_score`;
  const fallbackTrendingSelect = "0 AS recent_engagement_score";

  try {
    const [rows] = await pool.query(
      `SELECT d.*, c.name AS city_name, cat.name AS category_name, ${relevanceSelect}, ${trendingSelect}
       FROM deals d
       LEFT JOIN cities c ON c.id = d.city_id
       LEFT JOIN categories cat ON cat.id = d.category_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${orderBy}`,
      [...relevanceValues, ...values]
    );
    return rows;
  } catch (err) {
    if (err?.code !== "ER_BAD_FIELD_ERROR") {
      throw err;
    }
    const [rows] = await pool.query(
      `SELECT d.*, c.name AS city_name, cat.name AS category_name, ${relevanceSelect}, ${fallbackTrendingSelect}
       FROM deals d
       LEFT JOIN cities c ON c.id = d.city_id
       LEFT JOIN categories cat ON cat.id = d.category_id
       WHERE ${conditions.join(" AND ")}
       ORDER BY ${orderBy}`,
      [...relevanceValues, ...values]
    );
    return rows;
  }
}

async function createDeal({
  title,
  description,
  city_id,
  category_id,
  provider_name,
  original_price,
  discounted_price,
  expiry_date,
  deal_link,
  promo_code,
  image_url,
  is_premium,
  offer_type,
  offer_meta_json,
  terms_text,
  created_by
}) {
  try {
    const [result] = await pool.query(
      `INSERT INTO deals
        (title, description, city_id, category_id, provider_name, original_price, discounted_price, is_premium, expiry_date,
         deal_link, promo_code, image_url, offer_type, offer_meta_json, terms_text, status, popularity_score, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, NOW(), NOW())`,
      [
        title,
        description || null,
        city_id,
        category_id,
        provider_name || null,
        original_price ?? null,
        discounted_price ?? null,
        is_premium ? 1 : 0,
        expiry_date,
        deal_link || null,
        promo_code || null,
        image_url || null,
        offer_type || "percentage_off",
        offer_meta_json || null,
        terms_text || null,
        created_by
      ]
    );
    return result.insertId;
  } catch (err) {
    if (err?.code !== "ER_BAD_FIELD_ERROR") {
      throw err;
    }
    const [result] = await pool.query(
      `INSERT INTO deals
        (title, description, city_id, category_id, provider_name, original_price, discounted_price, is_premium, expiry_date,
         deal_link, promo_code, image_url, status, popularity_score, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, NOW(), NOW())`,
      [
        title,
        description || null,
        city_id,
        category_id,
        provider_name || null,
        original_price ?? null,
        discounted_price ?? null,
        is_premium ? 1 : 0,
        expiry_date,
        deal_link || null,
        promo_code || null,
        image_url || null,
        created_by
      ]
    );
    return result.insertId;
  }
}

async function listDealsByCreator(createdBy) {
  try {
    const [rows] = await pool.query(
      `SELECT
         d.id,
         d.title,
         d.description,
         d.city_id,
         d.category_id,
         d.provider_name,
         d.original_price,
         d.discounted_price,
         d.promo_code,
         d.deal_link,
         d.image_url,
         d.offer_type,
         d.offer_meta_json,
         d.terms_text,
         d.is_premium,
         d.status,
         d.review_note,
         d.expiry_date,
         d.created_at,
         d.updated_at,
         c.name AS city_name,
         cat.name AS category_name
       FROM deals d
       LEFT JOIN cities c ON c.id = d.city_id
       LEFT JOIN categories cat ON cat.id = d.category_id
       WHERE d.created_by = ?
       ORDER BY d.created_at DESC`,
      [createdBy]
    );
    return rows;
  } catch (err) {
    if (err?.code !== "ER_BAD_FIELD_ERROR") {
      throw err;
    }
    const [rows] = await pool.query(
      `SELECT
         d.id,
         d.title,
         d.description,
         d.city_id,
         d.category_id,
         d.provider_name,
         d.original_price,
         d.discounted_price,
         d.promo_code,
         d.deal_link,
         d.image_url,
         NULL AS offer_type,
         NULL AS offer_meta_json,
         NULL AS terms_text,
         d.is_premium,
         d.status,
         NULL AS review_note,
         d.expiry_date,
         d.created_at,
         d.updated_at,
         c.name AS city_name,
         cat.name AS category_name
       FROM deals d
       LEFT JOIN cities c ON c.id = d.city_id
       LEFT JOIN categories cat ON cat.id = d.category_id
       WHERE d.created_by = ?
       ORDER BY d.created_at DESC`,
      [createdBy]
    );
    return rows;
  }
}

async function findDealById(id) {
  const [rows] = await pool.query(
    `SELECT *
     FROM deals
     WHERE id = ?
     LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

async function findPublicDealById(id) {
  try {
    const [rows] = await pool.query(
      `SELECT d.*, c.name AS city_name, cat.name AS category_name,
        (
          CASE
            WHEN d.updated_at >= (NOW() - INTERVAL 14 DAY) THEN (COALESCE(d.click_count, 0) + (COALESCE(d.view_count, 0) * 2))
            ELSE 0
          END
        ) AS recent_engagement_score
       FROM deals d
       LEFT JOIN cities c ON c.id = d.city_id
       LEFT JOIN categories cat ON cat.id = d.category_id
       WHERE d.id = ? AND d.status = 'approved'
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  } catch (err) {
    if (err?.code !== "ER_BAD_FIELD_ERROR") {
      throw err;
    }
    const [rows] = await pool.query(
      `SELECT d.*, c.name AS city_name, cat.name AS category_name, 0 AS recent_engagement_score
       FROM deals d
       LEFT JOIN cities c ON c.id = d.city_id
       LEFT JOIN categories cat ON cat.id = d.category_id
       WHERE d.id = ? AND d.status = 'approved'
       LIMIT 1`,
      [id]
    );
    return rows[0] || null;
  }
}

async function findAnyDealByCreator(createdBy) {
  const [rows] = await pool.query(
    `SELECT id, status
     FROM deals
     WHERE created_by = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [createdBy]
  );
  return rows[0] || null;
}

async function updateDealByCreator({ id, createdBy, payload }) {
  const allowed = [
    "title",
    "description",
    "city_id",
    "category_id",
    "provider_name",
    "original_price",
    "discounted_price",
    "expiry_date",
    "deal_link",
    "promo_code",
    "image_url",
    "is_premium",
    "offer_type",
    "offer_meta_json",
    "terms_text"
  ];
  const entries = Object.entries(payload).filter(([key, value]) => allowed.includes(key) && value !== undefined);
  if (!entries.length) {
    return false;
  }
  const setClause = entries.map(([key]) => `${key} = ?`).join(", ");
  const values = entries.map(([, value]) => value);
  try {
    const [result] = await pool.query(
      `UPDATE deals
       SET ${setClause}, status = 'pending', review_note = NULL, updated_at = NOW()
       WHERE id = ? AND created_by = ?`,
      [...values, id, createdBy]
    );
    return result.affectedRows > 0;
  } catch (err) {
    if (err?.code !== "ER_BAD_FIELD_ERROR") {
      throw err;
    }
    const fallbackEntries = entries.filter(
      ([key]) => !["offer_type", "offer_meta_json", "terms_text"].includes(key)
    );
    if (!fallbackEntries.length) {
      return false;
    }
    const fallbackSetClause = fallbackEntries.map(([key]) => `${key} = ?`).join(", ");
    const fallbackValues = fallbackEntries.map(([, value]) => value);
    const [result] = await pool.query(
      `UPDATE deals
       SET ${fallbackSetClause}, status = 'pending', updated_at = NOW()
       WHERE id = ? AND created_by = ?`,
      [...fallbackValues, id, createdBy]
    );
    return result.affectedRows > 0;
  }
}

async function incrementDealPopularity({ dealId, delta, clickDelta = 0, viewDelta = 0 }) {
  const safeDelta = Number(delta) || 0;
  const safeClick = Number(clickDelta) || 0;
  const safeView = Number(viewDelta) || 0;
  try {
    const [result] = await pool.query(
      `UPDATE deals
       SET popularity_score = popularity_score + ?,
           click_count = click_count + ?,
           view_count = view_count + ?,
           updated_at = NOW()
       WHERE id = ? AND status = 'approved'`,
      [safeDelta, safeClick, safeView, dealId]
    );
    return result.affectedRows > 0;
  } catch (err) {
    if (err?.code !== "ER_BAD_FIELD_ERROR") {
      throw err;
    }
    const [result] = await pool.query(
      `UPDATE deals
       SET popularity_score = popularity_score + ?,
           updated_at = NOW()
       WHERE id = ? AND status = 'approved'`,
      [safeDelta, dealId]
    );
    return result.affectedRows > 0;
  }
}

module.exports = {
  listDeals,
  createDeal,
  listDealsByCreator,
  findAnyDealByCreator,
  findDealById,
  findPublicDealById,
  updateDealByCreator,
  incrementDealPopularity
};
