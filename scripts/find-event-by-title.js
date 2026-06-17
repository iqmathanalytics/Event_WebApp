require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

const term = process.argv[2] || "Cloud";

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true" ? { minVersion: "TLSv1.2" } : undefined
  });
  const [rows] = await conn.query(
    "SELECT id, title, seating_mode, seatsio_event_key, seatsio_chart_key FROM events WHERE title LIKE ? LIMIT 10",
    [`%${term}%`]
  );
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
})().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
