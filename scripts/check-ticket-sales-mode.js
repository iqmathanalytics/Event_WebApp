/**
 * Verify events.ticket_sales_mode in local DB.
 *
 *   node scripts/check-ticket-sales-mode.js          — read-only
 *   node scripts/check-ticket-sales-mode.js --smoke  — create platform row, verify, delete
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
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

async function readChecks(conn) {
  const [cols] = await conn.query("SHOW COLUMNS FROM events LIKE 'ticket_sales_mode'");
  // eslint-disable-next-line no-console
  console.log("ticket_sales_mode column:", cols.length ? `${cols[0].Field} ${cols[0].Type}` : "MISSING");

  const [sampleRows] = await conn.query(
    "SELECT id, title, ticket_sales_mode, status FROM events WHERE title LIKE ? ORDER BY id DESC LIMIT 15",
    ["%Sample%"]
  );
  // eslint-disable-next-line no-console
  console.log("events title LIKE %Sample%:", sampleRows.length);
  sampleRows.forEach((r) =>
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ id: r.id, title: r.title, ticket_sales_mode: r.ticket_sales_mode, status: r.status }))
  );

  const [pending] = await conn.query(
    "SELECT id, title, ticket_sales_mode, status FROM events WHERE status = 'pending' ORDER BY id DESC LIMIT 10"
  );
  // eslint-disable-next-line no-console
  console.log("latest pending:", pending.length);
  pending.forEach((r) =>
    // eslint-disable-next-line no-console
    console.log(JSON.stringify({ id: r.id, title: r.title, ticket_sales_mode: r.ticket_sales_mode, status: r.status }))
  );

  const [orphan] = await conn.query("SELECT id FROM events WHERE title LIKE 'Platform smoke%' LIMIT 5");
  if (orphan.length) {
    // eslint-disable-next-line no-console
    console.log("Cleaning leftover smoke rows:", orphan.length);
    await conn.query("DELETE FROM events WHERE title LIKE 'Platform smoke%'");
  }
}

async function smokeCreateVerifyDelete() {
  const { createEvent } = require("../src/models/eventModel");
  const { listListings } = require("../src/services/adminService");
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: buildSsl()
  });
  try {
    const [[u]] = await conn.query("SELECT id FROM users WHERE organizer_enabled = 1 LIMIT 1");
    const [[c]] = await conn.query("SELECT id FROM cities LIMIT 1");
    const [[cat]] = await conn.query("SELECT id FROM categories WHERE module_type = 'event' LIMIT 1");
    if (!u || !c || !cat) {
      // eslint-disable-next-line no-console
      console.log("SKIP smoke: missing user/city/category");
      return;
    }
    const suffix = Date.now();
    const eventId = await createEvent({
      title: `Platform smoke ${suffix}`,
      description: "test",
      event_date: "2026-12-01",
      schedule_type: "single",
      venue: "Test venue",
      venue_name: "Test venue",
      city_id: Number(c.id),
      category_id: Number(cat.id),
      organizer_id: Number(u.id),
      ticket_sales_mode: "platform",
      ticket_link: null,
      price: 10
    });
    const [[row]] = await conn.query("SELECT id, title, ticket_sales_mode FROM events WHERE id = ?", [eventId]);
    // eslint-disable-next-line no-console
    console.log("createEvent(platform) DB row:", JSON.stringify(row));

    const listed = await listListings({ type: "events", id: String(eventId) });
    const first = listed[0];
    // eslint-disable-next-line no-console
    console.log(
      "listListings({type:events,id}) ticket_sales_mode:",
      first ? first.ticket_sales_mode : "NO_ROW"
    );

    await conn.query("DELETE FROM events WHERE id = ?", [eventId]);
    // eslint-disable-next-line no-console
    console.log("smoke row deleted id=", eventId);
  } finally {
    await conn.end();
  }
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
    await readChecks(conn);
  } finally {
    await conn.end();
  }
  if (process.argv.includes("--smoke")) {
    await smokeCreateVerifyDelete();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("DB_ERROR", err.message);
  process.exit(1);
});
