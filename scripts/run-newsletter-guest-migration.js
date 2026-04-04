/**
 * One-shot: apply sql/newsletter_guest_columns.sql using DB_* from .env
 * Usage: node scripts/run-newsletter-guest-migration.js
 */
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function main() {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const database = process.env.DB_NAME;
  const port = Number(process.env.DB_PORT || 3306);

  if (!host || !user || !database) {
    console.error("Missing DB_HOST, DB_USER, or DB_NAME in environment (.env).");
    process.exit(1);
  }

  const sqlPath = path.join(__dirname, "..", "sql", "newsletter_guest_columns.sql");
  const sql = fs.readFileSync(sqlPath, "utf8");

  const conn = await mysql.createConnection({
    host,
    port,
    user,
    password,
    database,
    ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined
  });

  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith("--"));

  try {
    for (const stmt of statements) {
      try {
        await conn.query(`${stmt};`);
      } catch (err) {
        if (err.errno === 1060) {
          console.log("Skipped (already exists):", stmt.slice(0, 60) + "…");
        } else {
          throw err;
        }
      }
    }
    console.log("Done: sql/newsletter_guest_columns.sql");
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
