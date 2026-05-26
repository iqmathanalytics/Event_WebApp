/**
 * Clone all tables + row data from a source MySQL/TiDB database to a target database.
 *
 * Usage (env vars):
 *   SOURCE_DB_HOST, SOURCE_DB_PORT, SOURCE_DB_USER, SOURCE_DB_PASSWORD, SOURCE_DB_NAME
 *   TARGET_DB_HOST, TARGET_DB_PORT, TARGET_DB_USER, TARGET_DB_PASSWORD, TARGET_DB_NAME
 *   DB_SSL=true (optional, both connections)
 *
 * Target schema: runs bootstrap + migrations on TARGET first (empty DB recommended).
 *   SKIP_TARGET_MIGRATIONS=true — skip schema setup (target already migrated).
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const BATCH_SIZE = 200;

function buildSsl() {
  if (process.env.DB_SSL !== "true") {
    return undefined;
  }
  return {
    minVersion: "TLSv1.2",
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"
  };
}

function sourceConfig() {
  return {
    host: process.env.SOURCE_DB_HOST || process.env.DB_HOST,
    port: Number(process.env.SOURCE_DB_PORT || process.env.DB_PORT || 4000),
    user: process.env.SOURCE_DB_USER || process.env.DB_USER,
    password: process.env.SOURCE_DB_PASSWORD || process.env.DB_PASSWORD,
    database: process.env.SOURCE_DB_NAME || process.env.DB_NAME,
    ssl: buildSsl()
  };
}

function targetConfig(withDatabase = true) {
  const base = {
    host: process.env.TARGET_DB_HOST || process.env.PRODUCTION_DB_HOST,
    port: Number(
      process.env.TARGET_DB_PORT || process.env.PRODUCTION_DB_PORT || 4000
    ),
    user: process.env.TARGET_DB_USER || process.env.PRODUCTION_DB_USER,
    password:
      process.env.TARGET_DB_PASSWORD || process.env.PRODUCTION_DB_PASSWORD,
    ssl: buildSsl()
  };
  if (withDatabase) {
    base.database =
      process.env.TARGET_DB_NAME ||
      process.env.PRODUCTION_DB_NAME ||
      "test";
  }
  return base;
}

async function createTargetDatabase({ reset = false } = {}) {
  const conn = await mysql.createConnection(targetConfig(false));
  const dbName = (process.env.TARGET_DB_NAME || "test").replace(/`/g, "");
  try {
    if (reset) {
      // eslint-disable-next-line no-console
      console.log(`Resetting target database: ${dbName}`);
      await conn.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    }
    await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``);
    // eslint-disable-next-line no-console
    console.log(`Target database ready: ${dbName}`);
  } finally {
    await conn.end();
  }
}

async function runTargetMigrations() {
  if (String(process.env.SKIP_TARGET_MIGRATIONS || "").toLowerCase() === "true") {
    // eslint-disable-next-line no-console
    console.log("SKIP_TARGET_MIGRATIONS=true — skipping schema setup on target.");
    return;
  }

  const prev = {
    DB_HOST: process.env.DB_HOST,
    DB_PORT: process.env.DB_PORT,
    DB_USER: process.env.DB_USER,
    DB_PASSWORD: process.env.DB_PASSWORD,
    DB_NAME: process.env.DB_NAME
  };

  const t = targetConfig(true);
  process.env.DB_HOST = t.host;
  process.env.DB_PORT = String(t.port);
  process.env.DB_USER = t.user;
  process.env.DB_PASSWORD = t.password;
  process.env.DB_NAME = t.database;

  // eslint-disable-next-line no-console
  console.log("Running bootstrap + migrations on target…");
  const { spawnSync } = require("child_process");
  const repoRoot = path.resolve(__dirname, "..");
  const result = spawnSync(process.execPath, ["scripts/run-sql-migrations.js", "--bootstrap"], {
    cwd: repoRoot,
    env: { ...process.env, DB_SSL: process.env.DB_SSL || "true" },
    stdio: "inherit"
  });

  process.env.DB_HOST = prev.DB_HOST;
  process.env.DB_PORT = prev.DB_PORT;
  process.env.DB_USER = prev.DB_USER;
  process.env.DB_PASSWORD = prev.DB_PASSWORD;
  process.env.DB_NAME = prev.DB_NAME;

  if (result.status !== 0) {
    throw new Error("Target migrations failed");
  }
}

async function listTables(conn, database) {
  const [rows] = await conn.query(
    `SELECT TABLE_NAME AS name FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE'
     ORDER BY TABLE_NAME`,
    [database]
  );
  return rows.map((r) => r.name);
}

async function listColumns(conn, database, tableName) {
  const [rows] = await conn.query(
    `SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
     ORDER BY ORDINAL_POSITION`,
    [database, tableName]
  );
  return rows.map((r) => r.name);
}

function normalizeCell(value) {
  if (value === undefined) {
    return null;
  }
  if (value === null || Buffer.isBuffer(value) || typeof value !== "object") {
    return value;
  }
  if (value instanceof Date) {
    return value;
  }
  return JSON.stringify(value);
}

async function copyTable(sourceConn, targetConn, tableName, sourceDb, targetDb) {
  const sourceCols = await listColumns(sourceConn, sourceDb, tableName);
  const targetCols = await listColumns(targetConn, targetDb, tableName);
  const columns = targetCols.filter((c) => sourceCols.includes(c));
  if (!columns.length) {
    // eslint-disable-next-line no-console
    console.warn(`  ${tableName}: no shared columns (skip)`);
    return;
  }

  const skippedCols = sourceCols.filter((c) => !targetCols.includes(c));
  if (skippedCols.length) {
    // eslint-disable-next-line no-console
    console.warn(`  ${tableName}: source-only columns omitted: ${skippedCols.join(", ")}`);
  }

  const [countRows] = await sourceConn.query(`SELECT COUNT(*) AS c FROM \`${tableName}\``);
  const total = Number(countRows[0]?.c || 0);
  if (total === 0) {
    // eslint-disable-next-line no-console
    console.log(`  ${tableName}: 0 rows (skip)`);
    return;
  }

  await targetConn.query(`TRUNCATE TABLE \`${tableName}\``);

  const colList = columns.map((c) => `\`${c}\``).join(", ");
  const rowPlaceholder = `(${columns.map(() => "?").join(", ")})`;

  let offset = 0;
  let copied = 0;
  while (offset < total) {
    const [rows] = await sourceConn.query(
      `SELECT ${colList} FROM \`${tableName}\` LIMIT ? OFFSET ?`,
      [BATCH_SIZE, offset]
    );
    if (!rows.length) {
      break;
    }
    const sql = `INSERT INTO \`${tableName}\` (${colList}) VALUES ${rows.map(() => rowPlaceholder).join(", ")}`;
    const values = [];
    for (const row of rows) {
      for (const col of columns) {
        values.push(normalizeCell(row[col]));
      }
    }
    await targetConn.query(sql, values);
    copied += rows.length;
    offset += BATCH_SIZE;
  }

  // eslint-disable-next-line no-console
  console.log(`  ${tableName}: ${copied} rows copied`);
}

async function main() {
  const src = sourceConfig();
  const tgt = targetConfig(true);
  const tgtDb = tgt.database || "test";
  if (!tgt.host || !tgt.user || !tgt.password) {
    throw new Error(
      "Set TARGET_DB_* or PRODUCTION_DB_* (host, user, password) for the destination database"
    );
  }

  // eslint-disable-next-line no-console
  console.log(`Source: ${src.user}@${src.host}/${src.database}`);
  // eslint-disable-next-line no-console
  console.log(`Target: ${tgt.user}@${tgt.host}/${tgtDb}`);

  const resetTarget = String(process.env.RESET_TARGET_DB || "true").toLowerCase() !== "false";
  await createTargetDatabase({ reset: resetTarget });
  await runTargetMigrations();

  const sourceConn = await mysql.createConnection(src);
  const targetConn = await mysql.createConnection(targetConfig(true));

  try {
    await sourceConn.query("SELECT 1");
    await targetConn.query("SELECT 1");

    const sourceTables = await listTables(sourceConn, src.database);
    const targetTables = new Set(await listTables(targetConn, tgtDb));

    const tables = sourceTables.filter((t) => targetTables.has(t));
    const skipped = sourceTables.filter((t) => !targetTables.has(t));
    if (skipped.length) {
      // eslint-disable-next-line no-console
      console.warn("Tables on source but not on target (skipped):", skipped.join(", "));
    }

    await targetConn.query("SET FOREIGN_KEY_CHECKS = 0");
    await targetConn.query("SET UNIQUE_CHECKS = 0");
    // eslint-disable-next-line no-console
    console.log(`Copying ${tables.length} tables…`);
    for (const table of tables) {
      try {
        await copyTable(sourceConn, targetConn, table, src.database, tgtDb);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`  ${table}: FAILED — ${err.message}`);
        throw err;
      }
    }
    await targetConn.query("SET UNIQUE_CHECKS = 1");
    await targetConn.query("SET FOREIGN_KEY_CHECKS = 1");

    // eslint-disable-next-line no-console
    console.log("Database clone completed successfully.");
  } finally {
    await sourceConn.end();
    await targetConn.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
