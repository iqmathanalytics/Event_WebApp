/**
 * Assign check_in_code to paid/free bookings that do not have one yet.
 *
 *   node scripts/backfill-booking-check-in-codes.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const { pool } = require("../src/config/db");
const { generateCheckInCode } = require("../src/utils/bookingCheckIn");

async function main() {
  const [rows] = await pool.query(
    `SELECT id FROM event_bookings
     WHERE check_in_code IS NULL OR check_in_code = ''
     ORDER BY id ASC`
  );
  if (!rows.length) {
    console.log("No bookings need check-in codes.");
    process.exit(0);
  }

  let updated = 0;
  for (const row of rows) {
    const code = generateCheckInCode();
    await pool.query(`UPDATE event_bookings SET check_in_code = ? WHERE id = ?`, [code, row.id]);
    updated += 1;
  }
  console.log(`Assigned check_in_code to ${updated} booking(s).`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
