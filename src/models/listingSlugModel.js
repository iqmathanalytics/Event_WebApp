const { pool } = require("../config/db");
const { buildListingPublicSlug } = require("../utils/listingSlug");

const TABLES = {
  events: "title",
  deals: "title",
  influencers: "name"
};

async function setPublicSlug(table, id, label) {
  if (!TABLES[table]) {
    throw new Error(`Invalid table for public slug: ${table}`);
  }
  const slug = buildListingPublicSlug(label, id);
  await pool.query(`UPDATE ${table} SET public_slug = ? WHERE id = ?`, [slug, id]);
  return slug;
}

module.exports = {
  setPublicSlug
};
