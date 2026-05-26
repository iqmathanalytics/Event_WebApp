/**
 * One-off: inspect events.ticket_sales_mode for Sample titles + table DDL.
 *   node scripts/inspect-sample-events.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

function buildSsl() {
  if (process.env.DB_SSL !== "true") {
    return undefined;
  }
  return { minVersion: "TLSv1.2", rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" };
}

async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: buildSsl()
  });
  try {
    const [cols] = await c.query("SHOW COLUMNS FROM events WHERE Field = ?", ["ticket_sales_mode"]);
    // eslint-disable-next-line no-console
    console.log("COLUMN ticket_sales_mode:", cols[0] || "MISSING");

    const [rows] = await c.query(
      `SELECT id, title, ticket_sales_mode, status, updated_at
       FROM events WHERE title LIKE ? ORDER BY id DESC LIMIT 15`,
      ["%Sample%"]
    );
    // eslint-disable-next-line no-console
    console.log("events title LIKE %Sample%:", rows.length);
    rows.forEach((r) =>
      // eslint-disable-next-line no-console
      console.log(JSON.stringify(r))
    );

    const [ct] = await c.query("SHOW CREATE TABLE events");
    const ddl = ct[0]["Create Table"];
    // eslint-disable-next-line no-console
    console.log("\n--- SHOW CREATE TABLE events (truncated) ---\n", ddl.slice(0, 3500));
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
