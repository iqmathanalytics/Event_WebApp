/**
 * Inserts sample approved events/deals for local development.
 * Usage: from repo root, with DB_* env vars in .env (same as db:migrate):
 *   node scripts/seed-local-dev.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

function buildSsl() {
  if (process.env.DB_SSL !== "true") {
    return undefined;
  }
  return {
    minVersion: "TLSv1.2",
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"
  };
}

async function main() {
  const sqlPath = path.resolve(__dirname, "..", "sql", "local_dev_seed_listings.sql");
  if (!fs.existsSync(sqlPath)) {
    // eslint-disable-next-line no-console
    console.error("Missing sql/local_dev_seed_listings.sql");
    process.exit(1);
  }
  const raw = fs.readFileSync(sqlPath, "utf8");
  const statements = raw
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: buildSsl(),
    multipleStatements: false
  });

  try {
    for (const stmt of statements) {
      await conn.query(stmt);
    }
    // eslint-disable-next-line no-console
    console.log("Local dev seed applied (sql/local_dev_seed_listings.sql).");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
