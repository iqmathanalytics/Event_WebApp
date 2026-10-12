require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

function buildSsl() {
  if (process.env.DB_SSL !== "true") return undefined;
  return {
    minVersion: "TLSv1.2",
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
  };
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: buildSsl(),
  });
  try {
    const [rows] = await conn.query(
      `SELECT s.id, s.event_id, s.invite_token, s.accepted_at, s.revoked_at, s.vendor_code,
              e.title AS event_title, u.email AS invitee_email, o.email AS owner_email
       FROM event_vendor_shares s
       JOIN events e ON e.id = s.event_id
       LEFT JOIN users u ON u.id = s.shared_with_user_id
       LEFT JOIN users o ON o.id = s.owner_user_id
       WHERE s.event_id = 2948999
       ORDER BY s.id DESC`
    );
    console.log(JSON.stringify(rows, null, 2));
  } finally {
    await conn.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
