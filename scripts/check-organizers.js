require("dotenv").config();
const mysql = require("mysql2/promise");

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true }
  });

  try {
    const [rows] = await conn.query(
      "SELECT id, name, email, role, is_active FROM users WHERE role = 'organizer' ORDER BY id"
    );
    // eslint-disable-next-line no-console
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.message);
  process.exit(1);
});
