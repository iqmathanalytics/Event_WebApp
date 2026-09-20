/**
 * READ-ONLY copy of selected events from production TiDB → local TiDB.
 * Production connection is used only for SELECT. Never writes to production.
 *
 *   node scripts/copy-events-prod-to-local.js
 *   node scripts/copy-events-prod-to-local.js --ids=3939814,3669815
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

const DEFAULT_IDS = [3939814, 3669815];

function parseIds() {
  const arg = process.argv.find((a) => a.startsWith("--ids="));
  if (!arg) {
    return DEFAULT_IDS;
  }
  return arg
    .slice("--ids=".length)
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
}

function sslFromFlag(flag) {
  if (String(flag || "").toLowerCase() !== "true") {
    return undefined;
  }
  return {
    minVersion: "TLSv1.2",
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"
  };
}

function prodConfig() {
  const host = process.env.PRODUCTION_DB_HOST;
  const user = process.env.PRODUCTION_DB_USER;
  const password = process.env.PRODUCTION_DB_PASSWORD;
  if (!host || !user || !password) {
    throw new Error("Missing PRODUCTION_DB_* in .env");
  }
  return {
    host,
    port: Number(process.env.PRODUCTION_DB_PORT || 4000),
    user,
    password,
    database: process.env.PRODUCTION_DB_NAME || "test",
    ssl: sslFromFlag(process.env.PRODUCTION_DB_SSL || "true"),
    multipleStatements: false
  };
}

function localConfig() {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  if (!host || !user || !password) {
    throw new Error("Missing DB_* (local) in .env");
  }
  return {
    host,
    port: Number(process.env.DB_PORT || 4000),
    user,
    password,
    database: process.env.DB_NAME || "test",
    ssl: sslFromFlag(process.env.DB_SSL || "true"),
    multipleStatements: false
  };
}

function assertNotSameDb(a, b) {
  const key = (c) => `${c.host}:${c.port}/${c.database}`.toLowerCase();
  if (key(a) === key(b)) {
    throw new Error("Refusing to run: production and local DB configs point to the same host/database.");
  }
}

async function assertReadOnlyProd(prod) {
  const [modeRows] = await prod.query(`SELECT @@session.transaction_read_only AS ro`);
  // TiDB may not honor this on all plans; we still never issue writes on prod.
  void modeRows;
  await prod.query(`SET SESSION TRANSACTION READ ONLY`).catch(() => {});
}

async function selectAll(conn, sql, params = []) {
  const [rows] = await conn.query(sql, params);
  return rows;
}

async function upsertRows(local, table, rows) {
  if (!rows.length) {
    return 0;
  }
  const cols = Object.keys(rows[0]);
  const colList = cols.map((c) => `\`${c}\``).join(", ");
  const placeholders = `(${cols.map(() => "?").join(", ")})`;
  const updates = cols.map((c) => `\`${c}\`=VALUES(\`${c}\`)`).join(", ");
  const sql = `INSERT INTO \`${table}\` (${colList}) VALUES ${placeholders} ON DUPLICATE KEY UPDATE ${updates}`;
  let n = 0;
  for (const row of rows) {
    await local.query(
      sql,
      cols.map((c) => row[c])
    );
    n += 1;
  }
  return n;
}

async function tableExists(conn, table) {
  const [rows] = await conn.query(
    `SELECT 1 AS ok FROM information_schema.tables
     WHERE table_schema = DATABASE() AND table_name = ? LIMIT 1`,
    [table]
  );
  return rows.length > 0;
}

async function main() {
  const eventIds = parseIds();
  const prodCfg = prodConfig();
  const localCfg = localConfig();
  assertNotSameDb(prodCfg, localCfg);

  // eslint-disable-next-line no-console
  console.log("Production (READ-ONLY):", `${prodCfg.host}/${prodCfg.database}`);
  // eslint-disable-next-line no-console
  console.log("Local (WRITE):", `${localCfg.host}/${localCfg.database}`);
  // eslint-disable-next-line no-console
  console.log("Event IDs:", eventIds.join(", "));

  const prod = await mysql.createConnection(prodCfg);
  const local = await mysql.createConnection(localCfg);

  try {
    await assertReadOnlyProd(prod);

    const ph = eventIds.map(() => "?").join(", ");
    const events = await selectAll(
      prod,
      `SELECT * FROM events WHERE id IN (${ph})`,
      eventIds
    );
    if (!events.length) {
      throw new Error("No matching events found on production.");
    }
    // eslint-disable-next-line no-console
    console.log(
      "Found events:",
      events.map((e) => `${e.id} ${e.title} coupon=${e.coupon_codes_enabled}`).join(" | ")
    );

    const organizerIds = [...new Set(events.map((e) => Number(e.organizer_id)).filter(Boolean))];
    const cityIds = [...new Set(events.map((e) => Number(e.city_id)).filter(Boolean))];
    const categoryIds = [...new Set(events.map((e) => Number(e.category_id)).filter(Boolean))];

    const users = organizerIds.length
      ? await selectAll(prod, `SELECT * FROM users WHERE id IN (${organizerIds.map(() => "?").join(",")})`, organizerIds)
      : [];
    const cities = cityIds.length
      ? await selectAll(prod, `SELECT * FROM cities WHERE id IN (${cityIds.map(() => "?").join(",")})`, cityIds)
      : [];
    const categories = categoryIds.length
      ? await selectAll(
          prod,
          `SELECT * FROM categories WHERE id IN (${categoryIds.map(() => "?").join(",")})`,
          categoryIds
        )
      : [];

    const coupons = organizerIds.length
      ? await selectAll(
          prod,
          `SELECT * FROM event_coupons WHERE organizer_id IN (${organizerIds.map(() => "?").join(",")})`,
          organizerIds
        )
      : [];
    const couponIds = coupons.map((c) => Number(c.id));
    const couponEvents = couponIds.length
      ? await selectAll(
          prod,
          `SELECT * FROM event_coupon_events
           WHERE event_id IN (${ph})`,
          eventIds
        )
      : [];

    let seatsio = [];
    if (await tableExists(prod, "event_seatsio")) {
      seatsio = await selectAll(prod, `SELECT * FROM event_seatsio WHERE event_id IN (${ph})`, eventIds);
    }

    // ---- writes only on local ----
    // eslint-disable-next-line no-console
    console.log("Writing to local…");
    const counts = {
      users: await upsertRows(local, "users", users),
      cities: await upsertRows(local, "cities", cities),
      categories: await upsertRows(local, "categories", categories),
      events: await upsertRows(local, "events", events),
      event_coupons: await upsertRows(local, "event_coupons", coupons),
      event_coupon_events: 0,
      event_seatsio: 0
    };

    if (couponEvents.length && (await tableExists(local, "event_coupon_events"))) {
      counts.event_coupon_events = await upsertRows(local, "event_coupon_events", couponEvents);
    }
    if (seatsio.length && (await tableExists(local, "event_seatsio"))) {
      counts.event_seatsio = await upsertRows(local, "event_seatsio", seatsio);
    }

    const [verify] = await local.query(
      `SELECT id, title, coupon_codes_enabled, public_slug FROM events WHERE id IN (${ph})`,
      eventIds
    );

    // eslint-disable-next-line no-console
    console.log("Upserted:", counts);
    // eslint-disable-next-line no-console
    console.log("Local verify:", verify);
    // eslint-disable-next-line no-console
    console.log("Done. Production was not modified.");
  } finally {
    await prod.end();
    await local.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
