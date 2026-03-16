require("dotenv").config();
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

async function main() {
  const name = process.argv[2];
  const email = process.argv[3];
  const mobile = process.argv[4];
  const password = process.argv[5];

  if (!name || !email || !mobile || !password) {
    // eslint-disable-next-line no-console
    console.error("Usage: node scripts/create-admin.js <name> <email> <mobile> <password>");
    process.exit(1);
  }

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true }
  });

  try {
    const [existing] = await conn.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    if (existing.length) {
      // eslint-disable-next-line no-console
      console.log("Admin email already exists.");
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await conn.query(
      `INSERT INTO users (name, email, mobile_number, password_hash, role, is_active, created_at)
       VALUES (?, ?, ?, ?, 'admin', 1, NOW())`,
      [name, email, mobile, passwordHash]
    );
    // eslint-disable-next-line no-console
    console.log("Admin account created.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err.message);
  process.exit(1);
});
