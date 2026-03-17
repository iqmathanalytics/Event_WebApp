const fs = require("fs");
const path = require("path");
const { pool } = require("../src/config/db");

async function run() {
  const sqlPath = path.resolve(__dirname, "..", "sql", "multi_day_events_and_booking_amounts.sql");
  const raw = fs.readFileSync(sqlPath, "utf8");
  const statements = raw
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err) {
      if (!String(err?.message || "").includes("Duplicate column name")) {
        throw err;
      }
    }
  }

  const [[eventCols]] = await pool.query(
    "SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'events' AND COLUMN_NAME IN ('schedule_type','event_start_date','event_end_date','event_dates_json')"
  );
  const [[bookingCols]] = await pool.query(
    "SELECT COUNT(*) AS total FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'event_bookings' AND COLUMN_NAME IN ('selected_dates_json','total_days','total_amount')"
  );

  console.log(
    `Migration applied. Event columns: ${eventCols.total}/4, Booking columns: ${bookingCols.total}/3`
  );
}

run()
  .catch((err) => {
    console.error(err.message || err);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await pool.end();
    } catch (_err) {
      // ignore
    }
  });
