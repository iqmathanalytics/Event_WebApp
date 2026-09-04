/**
 * Idempotent schema repair for guest coupon holds (email-based holds without user_id).
 * Safe to run on production TiDB after deploy.
 *
 *   node scripts/ensure-guest-coupon-schema.js
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

async function columnExists(conn, table, column) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n
     FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  return Number(rows[0]?.n || 0) > 0;
}

async function indexExists(conn, table, indexName) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n
     FROM information_schema.statistics
     WHERE table_schema = DATABASE() AND table_name = ? AND index_name = ?`,
    [table, indexName]
  );
  return Number(rows[0]?.n || 0) > 0;
}

async function foreignKeyExists(conn, table, constraintName) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS n
     FROM information_schema.table_constraints
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND constraint_name = ?
       AND constraint_type = 'FOREIGN KEY'`,
    [table, constraintName]
  );
  return Number(rows[0]?.n || 0) > 0;
}

async function dropForeignKeyIfExists(conn, table, constraintName) {
  if (!(await foreignKeyExists(conn, table, constraintName))) {
    return;
  }
  await conn.query(`ALTER TABLE ${table} DROP FOREIGN KEY ${constraintName}`);
  console.log(`dropped FK ${table}.${constraintName}`);
}

async function ensureGuestCouponHolds(conn) {
  const hasGuestEmail = await columnExists(conn, "event_coupon_holds", "guest_email");

  await dropForeignKeyIfExists(conn, "event_coupon_holds", "fk_event_coupon_holds_user");

  await conn.query(`ALTER TABLE event_coupon_holds MODIFY COLUMN user_id BIGINT UNSIGNED NULL`);
  console.log("event_coupon_holds.user_id nullable");

  if (!hasGuestEmail) {
    await conn.query(
      `ALTER TABLE event_coupon_holds ADD COLUMN guest_email VARCHAR(255) NULL AFTER user_id`
    );
    console.log("added event_coupon_holds.guest_email");
  } else {
    console.log("event_coupon_holds.guest_email already present");
  }

  if (!(await indexExists(conn, "event_coupon_holds", "idx_event_coupon_holds_guest_email"))) {
    await conn.query(
      `ALTER TABLE event_coupon_holds ADD KEY idx_event_coupon_holds_guest_email (guest_email)`
    );
    console.log("added idx_event_coupon_holds_guest_email");
  }

  if (!(await foreignKeyExists(conn, "event_coupon_holds", "fk_event_coupon_holds_user"))) {
    await conn.query(
      `ALTER TABLE event_coupon_holds
       ADD CONSTRAINT fk_event_coupon_holds_user
       FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE`
    );
    console.log("restored fk_event_coupon_holds_user");
  }
}

async function ensureGuestCouponRedemptions(conn) {
  await dropForeignKeyIfExists(conn, "event_coupon_redemptions", "fk_event_coupon_redemptions_user");

  await conn.query(`ALTER TABLE event_coupon_redemptions MODIFY COLUMN user_id BIGINT UNSIGNED NULL`);
  console.log("event_coupon_redemptions.user_id nullable");

  if (!(await foreignKeyExists(conn, "event_coupon_redemptions", "fk_event_coupon_redemptions_user"))) {
    await conn.query(
      `ALTER TABLE event_coupon_redemptions
       ADD CONSTRAINT fk_event_coupon_redemptions_user
       FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE`
    );
    console.log("restored fk_event_coupon_redemptions_user");
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
    console.log("Ensuring guest coupon schema…");
    await ensureGuestCouponHolds(conn);
    await ensureGuestCouponRedemptions(conn);
    console.log("Guest coupon schema OK.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
