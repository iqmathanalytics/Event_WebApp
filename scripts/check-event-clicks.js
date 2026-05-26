require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl:
      process.env.DB_SSL === "true"
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
        : undefined
  });

  const [cols] = await conn.query("SHOW COLUMNS FROM events LIKE 'click_count'");
  console.log("click_count column:", cols.length ? cols[0].Field : "MISSING");

  const [rows] = await conn.query(
    "SELECT id, title, click_count, view_count, status FROM events ORDER BY click_count DESC, id ASC LIMIT 8"
  );
  console.log("top events by clicks:", rows);

  const [stats] = await conn.query(
    "SELECT COUNT(*) AS n, COALESCE(SUM(click_count), 0) AS total_clicks FROM events"
  );
  console.log("aggregate:", stats[0]);

  await conn.end();
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
