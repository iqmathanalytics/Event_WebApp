/**
 * Apply SQL migrations to production TiDB Cloud (not MilesWeb MySQL).
 * Reads PRODUCTION_DB_* from .env, or falls back to commented "Shared / production TiDB" block.
 *
 *   node scripts/migrate-production-tidb.js
 *   node scripts/migrate-production-tidb.js --backfill-slugs
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const { spawnSync } = require("child_process");
const mysql = require("mysql2/promise");
const path = require("path");

function prodConfig() {
  const host = process.env.PRODUCTION_DB_HOST || process.env.SOURCE_DB_HOST;
  const port = process.env.PRODUCTION_DB_PORT || process.env.SOURCE_DB_PORT || "4000";
  const user = process.env.PRODUCTION_DB_USER || process.env.SOURCE_DB_USER;
  const password = process.env.PRODUCTION_DB_PASSWORD || process.env.SOURCE_DB_PASSWORD;
  const database = process.env.PRODUCTION_DB_NAME || process.env.SOURCE_DB_NAME || "test";

  if (!host || !user || !password) {
    console.error(
      "Missing production TiDB credentials.\n" +
        "Set PRODUCTION_DB_HOST, PRODUCTION_DB_USER, PRODUCTION_DB_PASSWORD (and optional PORT, NAME)\n" +
        "or uncomment SOURCE_DB_* / production block in .env"
    );
    process.exit(1);
  }

  return {
    host,
    port: Number(port),
    user,
    password,
    database,
    ssl:
      (process.env.PRODUCTION_DB_SSL || process.env.SOURCE_DB_SSL || "true") === "true"
        ? {
            minVersion: "TLSv1.2",
            rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"
          }
        : undefined
  };
}

async function testConnection(cfg) {
  const conn = await mysql.createConnection(cfg);
  try {
    const [rows] = await conn.query("SELECT DATABASE() AS db, VERSION() AS version");
    console.log(`Connected to TiDB: database=${rows[0].db}, version=${String(rows[0].version).slice(0, 40)}…`);
  } finally {
    await conn.end();
  }
}

async function checkSchema(cfg) {
  const conn = await mysql.createConnection(cfg);
  try {
    const checks = [
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'events'",
      "SELECT COUNT(*) AS n FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'events' AND column_name = 'ticket_sales_mode'",
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'event_coupons'",
      "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'event_bookings'"
    ];
    const labels = ["events table", "events.ticket_sales_mode", "event_coupons table", "event_bookings table"];
    for (let i = 0; i < checks.length; i += 1) {
      const [r] = await conn.query(checks[i]);
      const ok = Number(r[0].n) > 0;
      console.log(ok ? "OK" : "MISSING", labels[i]);
    }
  } finally {
    await conn.end();
  }
}

function runScript(script, extraArgs = []) {
  const cfg = prodConfig();
  const env = {
    ...process.env,
    DB_HOST: cfg.host,
    DB_PORT: String(cfg.port),
    DB_USER: cfg.user,
    DB_PASSWORD: cfg.password,
    DB_NAME: cfg.database,
    DB_SSL: cfg.ssl ? "true" : "false"
  };
  const r = spawnSync(process.execPath, [path.join(__dirname, script), ...extraArgs], {
    cwd: path.resolve(__dirname, ".."),
    env,
    stdio: "inherit"
  });
  if (r.status !== 0) {
    process.exit(r.status || 1);
  }
}

async function main() {
  const cfg = prodConfig();
  console.log("=== Production TiDB Cloud migrations ===");
  console.log(`Host: ${cfg.host}`);
  console.log(`Database: ${cfg.database}\n`);

  await testConnection(cfg);

  console.log("\nRunning SQL migrations…");
  runScript("run-sql-migrations.js");

  if (process.argv.includes("--backfill-slugs")) {
    console.log("\nBackfilling public slugs…");
    runScript("backfill-listing-slugs.js");
  }

  if (process.argv.includes("--backfill-check-in")) {
    console.log("\nBackfilling booking check-in codes…");
    runScript("backfill-booking-check-in-codes.js");
  }

  console.log("\nSchema verification:");
  await checkSchema(cfg);
  console.log("\nProduction TiDB migrations finished.");
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
