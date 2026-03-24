require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

async function run() {
  const sqlPath = path.resolve(__dirname, "..", "sql", "user_onboarding_profiles.sql");
  const raw = fs.readFileSync(sqlPath, "utf8");
  const statements = raw
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);

  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: { minVersion: "TLSv1.2", rejectUnauthorized: true }
  });

  try {
    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (err) {
        const msg = String(err?.message || "");
        if (msg.includes("already exists")) {
          // ignore
        } else {
          throw err;
        }
      }
    }
    // eslint-disable-next-line no-console
    console.log("user onboarding profiles migration applied.");
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
