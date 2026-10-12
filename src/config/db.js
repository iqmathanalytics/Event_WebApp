const mysql = require("mysql2/promise");
const { db } = require("./env");

function envInt(name, fallback) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

// Fail fast when the remote DB is slow/asleep instead of queuing forever (queueLimit: 0).
const connectionLimit = Math.max(1, envInt("DB_POOL_LIMIT", 15));
const queueLimit = envInt("DB_POOL_QUEUE_LIMIT", 40);
const connectTimeout = Math.max(1000, envInt("DB_CONNECT_TIMEOUT_MS", 10000));

const pool = mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  dateStrings: true,
  waitForConnections: true,
  connectionLimit,
  queueLimit,
  connectTimeout,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10_000,
  maxIdle: connectionLimit,
  idleTimeout: envInt("DB_IDLE_TIMEOUT_MS", 60_000),
  ssl: db.ssl
    ? {
        minVersion: "TLSv1.2",
        rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"
      }
    : undefined
});

async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.query({ sql: "SELECT 1", timeout: connectTimeout });
  } finally {
    conn.release();
  }
}

module.exports = {
  pool,
  testConnection
};
