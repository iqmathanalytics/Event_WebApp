/**
 * Quick row counts per table. Usage: DB_* from .env, or SOURCE_DB_* / TARGET_DB_*.
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

function buildSsl() {
  if (process.env.DB_SSL !== "true") return undefined;
  return { minVersion: "TLSv1.2", rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" };
}

function config(prefix) {
  if (prefix === "SOURCE") {
    return {
      host: process.env.SOURCE_DB_HOST,
      port: Number(process.env.SOURCE_DB_PORT || 4000),
      user: process.env.SOURCE_DB_USER,
      password: process.env.SOURCE_DB_PASSWORD,
      database: process.env.SOURCE_DB_NAME || "test",
      ssl: buildSsl()
    };
  }
  if (prefix === "TARGET") {
    return {
      host: process.env.TARGET_DB_HOST || process.env.DB_HOST,
      port: Number(process.env.TARGET_DB_PORT || process.env.DB_PORT || 4000),
      user: process.env.TARGET_DB_USER || process.env.DB_USER,
      password: process.env.TARGET_DB_PASSWORD || process.env.DB_PASSWORD,
      database: process.env.TARGET_DB_NAME || process.env.DB_NAME || "test",
      ssl: buildSsl()
    };
  }
  return {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 4000),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: buildSsl()
  };
}

async function counts(label, cfg) {
  const conn = await mysql.createConnection(cfg);
  try {
    const [tables] = await conn.query(
      `SELECT TABLE_NAME AS name FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`,
      [cfg.database]
    );
    // eslint-disable-next-line no-console
    console.log(`\n=== ${label} (${cfg.user}@${cfg.host}/${cfg.database}) ===`);
    let total = 0;
    for (const { name } of tables) {
      const [r] = await conn.query(`SELECT COUNT(*) AS c FROM \`${name}\``);
      const c = Number(r[0].c);
      total += c;
      if (c > 0) {
        // eslint-disable-next-line no-console
        console.log(`  ${name}: ${c}`);
      }
    }
    // eslint-disable-next-line no-console
    console.log(`  (total rows: ${total})`);
  } finally {
    await conn.end();
  }
}

async function main() {
  const mode = process.argv[2] || "current";
  if (mode === "compare") {
    await counts("SOURCE", config("SOURCE"));
    await counts("TARGET", config("TARGET"));
    return;
  }
  await counts("DB", config());
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
