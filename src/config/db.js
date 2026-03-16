const mysql = require("mysql2/promise");
const { db } = require("./env");

const pool = mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  dateStrings: true,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: db.ssl ? { minVersion: "TLSv1.2", rejectUnauthorized: true } : undefined
});

async function testConnection() {
  const conn = await pool.getConnection();
  try {
    await conn.query("SELECT 1");
  } finally {
    conn.release();
  }
}

module.exports = {
  pool,
  testConnection
};
