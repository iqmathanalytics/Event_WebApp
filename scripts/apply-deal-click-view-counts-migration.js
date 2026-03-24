const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

async function run() {
  const sqlPath = path.resolve(__dirname, "..", "sql", "deal_click_view_counts.sql");
  const raw = fs.readFileSync(sqlPath, "utf8");
  const statements = raw
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const ssl =
    process.env.DB_SSL === "true"
      ? {
          minVersion: "TLSv1.2",
          rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"
        }
      : undefined;

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl
  });

  try {
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (err) {
        const msg = String(err?.message || "");
        if (msg.includes("Duplicate column") || msg.includes("already exists")) {
          // ignore
        } else {
          throw err;
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log("deal click/view counts migration applied.");
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});

