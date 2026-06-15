require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");
const fs = require("fs");
const path = require("path");

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
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: buildSsl()
  });
  try {
    const [eventCols] = await conn.query("SHOW COLUMNS FROM events");
    const eventFields = eventCols.map((row) => row.Field);
    const needed = ["seating_mode", "seatsio_chart_key", "seatsio_event_key"];
    const missing = needed.filter((name) => !eventFields.includes(name));
    console.log("events columns present:", needed.filter((n) => eventFields.includes(n)).join(", ") || "(none)");
    console.log("events columns missing:", missing.join(", ") || "(none)");
    if (missing.length) {
      const sql = fs.readFileSync(path.resolve(__dirname, "..", "sql", "event_seatsio.sql"), "utf8");
      const statements = sql
        .split(/;\s*(?:\r?\n|$)/)
        .map((s) => s.trim())
        .filter(Boolean);
      for (const stmt of statements) {
        try {
          await conn.query(stmt);
          console.log("applied:", stmt.slice(0, 60).replace(/\s+/g, " ") + "...");
        } catch (err) {
          console.error("failed:", err.message);
        }
      }
    }
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
