const { pool } = require("../config/db");

const LISTING_TABLES = {
  event: "events",
  deal: "deals",
  influencer: "influencers",
  service: "services"
};

function resolveListingTable(listingType) {
  return LISTING_TABLES[listingType] || null;
}

async function listingExists({ listingType, listingId }) {
  const table = resolveListingTable(listingType);
  if (!table) {
    return false;
  }

  const [rows] = await pool.query(`SELECT id FROM ${table} WHERE id = ? LIMIT 1`, [listingId]);
  return rows.length > 0;
}

async function createFavorite({ userId, listingType, listingId }) {
  const [result] = await pool.query(
    `INSERT INTO favorites (user_id, listing_type, listing_id, created_at)
     VALUES (?, ?, ?, NOW())
     ON DUPLICATE KEY UPDATE created_at = created_at`,
    [userId, listingType, listingId]
  );
  return result.affectedRows > 0;
}

async function deleteFavorite({ userId, listingType, listingId }) {
  const [result] = await pool.query(
    `DELETE FROM favorites
     WHERE user_id = ? AND listing_type = ? AND listing_id = ?`,
    [userId, listingType, listingId]
  );
  return result.affectedRows > 0;
}

async function getFavoritesByUser({ userId, listingType }) {
  const values = [userId];
  let typeFilter = "";

  if (listingType) {
    typeFilter = "AND f.listing_type = ?";
    values.push(listingType);
  }

  const [rows] = await pool.query(
    `SELECT
      f.id,
      f.listing_type,
      f.listing_id,
      f.created_at,
      COALESCE(e.title, d.title, i.name, s.title) AS title,
      COALESCE(e.image_url, d.image_url, i.profile_image_url, s.image_url) AS image_url,
      COALESCE(ec.name, dc.name, ic.name, sc.name) AS city_name,
      COALESCE(ecat.name, dcat.name, icat.name, scat.name) AS category_name,
      e.price AS event_price,
      COALESCE(d.discounted_price, d.original_price) AS deal_price,
      s.price_min AS service_price
     FROM favorites f
     LEFT JOIN events e
       ON f.listing_type = 'event' AND f.listing_id = e.id
     LEFT JOIN deals d
       ON f.listing_type = 'deal' AND f.listing_id = d.id
     LEFT JOIN influencers i
       ON f.listing_type = 'influencer' AND f.listing_id = i.id
     LEFT JOIN services s
       ON f.listing_type = 'service' AND f.listing_id = s.id
     LEFT JOIN cities ec ON ec.id = e.city_id
     LEFT JOIN cities dc ON dc.id = d.city_id
     LEFT JOIN cities ic ON ic.id = i.city_id
     LEFT JOIN cities sc ON sc.id = s.city_id
     LEFT JOIN categories ecat ON ecat.id = e.category_id
     LEFT JOIN categories dcat ON dcat.id = d.category_id
     LEFT JOIN categories icat ON icat.id = i.category_id
     LEFT JOIN categories scat ON scat.id = s.category_id
     WHERE f.user_id = ?
     ${typeFilter}
     ORDER BY f.created_at DESC`,
    values
  );
  return rows;
}

module.exports = {
  listingExists,
  createFavorite,
  deleteFavorite,
  getFavoritesByUser
};
