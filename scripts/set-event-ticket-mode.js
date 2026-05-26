require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

function buildSsl() {
  if (process.env.DB_SSL !== "true") return undefined;
  return { minVersion: "TLSv1.2", rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" };
}

async function main() {
  const id = Number(process.argv[2] || 1919405);
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: buildSsl()
  });
  try {
    const [r] = await c.query("UPDATE events SET ticket_sales_mode = ? WHERE id = ? AND status = ?", [
      "platform",
      id,
      "pending"
    ]);
    // eslint-disable-next-line no-console
    console.log("UPDATE affectedRows:", r.affectedRows);
    const [[row]] = await c.query("SELECT id, title, ticket_sales_mode, status FROM events WHERE id = ?", [id]);
    // eslint-disable-next-line no-console
    console.log("ROW:", row);
  } finally {
    await c.end();
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
