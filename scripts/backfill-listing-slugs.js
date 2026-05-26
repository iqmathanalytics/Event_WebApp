/**
 * Backfill public_slug for events, deals, influencers.
 * Run after listing_public_slugs.sql: node scripts/backfill-listing-slugs.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");
const { buildListingPublicSlug } = require("../src/utils/listingSlug");

function buildSsl() {
  if (process.env.DB_SSL !== "true") {
    return undefined;
  }
  return {
    minVersion: "TLSv1.2",
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"
  };
}

async function backfillTable(conn, table, nameColumn) {
  const [rows] = await conn.query(
    `SELECT id, ${nameColumn} AS label, public_slug FROM ${table} WHERE public_slug IS NULL OR public_slug = ''`
  );
  let updated = 0;
  for (const row of rows) {
    const slug = buildListingPublicSlug(row.label, row.id);
    await conn.query(`UPDATE ${table} SET public_slug = ? WHERE id = ?`, [slug, row.id]);
    updated += 1;
  }
  const [fixDup] = await conn.query(
    `SELECT id, ${nameColumn} AS label FROM ${table} WHERE public_slug IS NULL OR public_slug = ''`
  );
  for (const row of fixDup) {
    const slug = buildListingPublicSlug(row.label, row.id);
    await conn.query(`UPDATE ${table} SET public_slug = ? WHERE id = ?`, [slug, row.id]);
    updated += 1;
  }
  return updated;
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: buildSsl()
  });

  try {
    const e = await backfillTable(conn, "events", "title");
    const d = await backfillTable(conn, "deals", "title");
    const i = await backfillTable(conn, "influencers", "name");
    // eslint-disable-next-line no-console
    console.log(`Backfilled slugs: events=${e}, deals=${d}, influencers=${i}`);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
