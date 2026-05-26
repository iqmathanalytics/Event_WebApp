/**
 * Remove bulk-synced US cities that are not referenced anywhere.
 * Keeps bootstrap metros (ids 1–20 slugs) + APP metro slugs + any city_id in use.
 *
 * Usage: node scripts/prune-unused-cities.js
 *        node scripts/prune-unused-cities.js --dry-run
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const { pool } = require("../src/config/db");

const KEEP_SLUGS = [
  "new-york-ny",
  "los-angeles-ca",
  "miami-fl",
  "chicago-il",
  "austin-tx",
  "san-francisco-ca",
  "san-diego-ca",
  "seattle-wa",
  "boston-ma",
  "dallas-tx",
  "houston-tx",
  "las-vegas-nv",
  "denver-co",
  "atlanta-ga",
  "orlando-fl",
  "washington-dc",
  "phoenix-az",
  "nashville-tn",
  "san-jose-ca",
  "portland-or",
  "san-antonio-tx"
];

const dryRun = process.argv.includes("--dry-run");

async function main() {
  const conn = await pool.getConnection();
  try {
    const [[before]] = await conn.query("SELECT COUNT(*) AS c FROM cities");

    const [referenced] = await conn.query(
      `SELECT DISTINCT city_id FROM (
        SELECT city_id FROM events WHERE city_id IS NOT NULL
        UNION SELECT city_id FROM deals WHERE city_id IS NOT NULL
        UNION SELECT city_id FROM influencers WHERE city_id IS NOT NULL
        UNION SELECT city_id FROM services WHERE city_id IS NOT NULL
        UNION SELECT city_id FROM contact_messages WHERE city_id IS NOT NULL
        UNION SELECT city_id FROM newsletter_subscribers WHERE city_id IS NOT NULL
        UNION SELECT city_id FROM user_onboarding_profiles WHERE city_id IS NOT NULL
        UNION SELECT city_id FROM dealer_profiles WHERE city_id IS NOT NULL
      ) refs`
    );
    const referencedIds = referenced.map((r) => r.city_id);

    const slugPlaceholders = KEEP_SLUGS.map(() => "?").join(", ");
    const idPlaceholders = referencedIds.length ? referencedIds.map(() => "?").join(", ") : "0";

    const countSql = `SELECT COUNT(*) AS c FROM cities
      WHERE slug NOT IN (${slugPlaceholders})
      ${referencedIds.length ? `AND id NOT IN (${idPlaceholders})` : ""}`;

    const [[toDelete]] = await conn.query(countSql, [...KEEP_SLUGS, ...referencedIds]);

    // eslint-disable-next-line no-console
    console.log(`Cities before: ${before.c}`);
    // eslint-disable-next-line no-console
    console.log(`Referenced city_ids: ${referencedIds.length ? referencedIds.join(", ") : "(none)"}`);
    // eslint-disable-next-line no-console
    console.log(`Rows to delete: ${toDelete.c}`);

    if (dryRun) {
      // eslint-disable-next-line no-console
      console.log("Dry run — no rows deleted.");
      return;
    }

    if (toDelete.c === 0) {
      // eslint-disable-next-line no-console
      console.log("Nothing to prune.");
      return;
    }

    const deleteSql = `DELETE FROM cities
      WHERE slug NOT IN (${slugPlaceholders})
      ${referencedIds.length ? `AND id NOT IN (${idPlaceholders})` : ""}`;

    const [result] = await conn.query(deleteSql, [...KEEP_SLUGS, ...referencedIds]);
    const [[after]] = await conn.query("SELECT COUNT(*) AS c FROM cities");

    // eslint-disable-next-line no-console
    console.log(`Deleted ${result.affectedRows} rows. Cities after: ${after.c}`);
  } finally {
    conn.release();
    await pool.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
