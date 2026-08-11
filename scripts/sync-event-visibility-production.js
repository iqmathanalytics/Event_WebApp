/**
 * One-time sync: align is_listed with show_on_events_page on production TiDB.
 *   node scripts/sync-event-visibility-production.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function prodConfig() {
  const host = process.env.PRODUCTION_DB_HOST || process.env.SOURCE_DB_HOST;
  const port = process.env.PRODUCTION_DB_PORT || process.env.SOURCE_DB_PORT || "4000";
  const user = process.env.PRODUCTION_DB_USER || process.env.SOURCE_DB_USER;
  const password = process.env.PRODUCTION_DB_PASSWORD || process.env.SOURCE_DB_PASSWORD;
  const database = process.env.PRODUCTION_DB_NAME || process.env.SOURCE_DB_NAME || "test";

  if (!host || !user || !password) {
    throw new Error("Missing PRODUCTION_DB_* credentials in .env");
  }

  return {
    host,
    port: Number(port),
    user,
    password,
    database,
    multipleStatements: true,
    ssl:
      (process.env.PRODUCTION_DB_SSL || process.env.SOURCE_DB_SSL || "true") === "true"
        ? {
            minVersion: "TLSv1.2",
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"
          }
        : undefined
  };
}

const mismatchSql = `
  SELECT
    SUM(CASE WHEN COALESCE(show_on_events_page,1)=0 AND COALESCE(is_listed,1)=1 THEN 1 ELSE 0 END) AS organizer_hidden_still_listed,
    SUM(CASE WHEN COALESCE(is_listed,1)=0 AND COALESCE(show_on_events_page,1)=1 THEN 1 ELSE 0 END) AS admin_inactive_still_shown_flag
  FROM events
`;

async function main() {
  const cfg = prodConfig();
  const conn = await mysql.createConnection(cfg);
  try {
    const [before] = await conn.query(mismatchSql);
    console.log("Before sync:", before[0]);

    const sqlPath = path.join(__dirname, "..", "sql", "sync_event_visibility_flags.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");
    await conn.query(sql);

    const [after] = await conn.query(mismatchSql);
    console.log("After sync:", after[0]);
    console.log("SQL sync applied successfully on", cfg.database);
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
