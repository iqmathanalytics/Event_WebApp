/**
 * Debug GA4 realtime vs standard for one event.
 * Usage: node scripts/debug-ga-realtime.js [eventId]
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const ga = require("../src/services/googleAnalyticsService");

const eventId = Number(process.argv[2]) || 514878;

async function main() {
  console.log("GA configured:", ga.isConfigured());
  if (!ga.isConfigured()) {
    process.exit(1);
  }

  const mysql = require("mysql2/promise");
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT) || 4000,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: true } : undefined
  });
  const [rows] = await conn.query("SELECT id, title FROM events WHERE id = ? LIMIT 1", [eventId]);
  await conn.end();
  const event = rows[0];
  if (!event) {
    console.error("Event not found:", eventId);
    process.exit(1);
  }
  console.log("Event:", event.id, event.title);

  const realtime = await ga.getRealtimeEventMetrics(eventId, event.title);
  console.log("\nRealtime (path/title):", realtime);

  const metrics = await ga.getEventTrafficMetrics(eventId, {
    eventTitle: event.title,
    realtime
  });
  console.log("\nTraffic metrics:");
  console.log(JSON.stringify(metrics, null, 2));

  const hourly = await ga.getEventHourlyChart(eventId, { eventTitle: event.title });
  const current = hourly.hourly_today.find((r) => r.is_current_hour);
  console.log("\nCurrent hour bucket:", current);
  console.log("Hourly chart meta:", hourly.hourly_chart);
}

main().catch((err) => {
  console.error(err?.message || err);
  process.exit(1);
});
