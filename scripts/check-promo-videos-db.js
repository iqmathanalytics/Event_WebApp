require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");
const { parsePromoVideoUrls, promoVideoUrlsDbValue } = require("../src/utils/youtubeVideo");
const { findEventById } = require("../src/models/eventModel");

function buildSsl() {
  if (process.env.DB_SSL !== "true") {
    return undefined;
  }
  return {
    minVersion: "TLSv1.2",
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"
  };
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: buildSsl()
  });

  const [cols] = await conn.query("SHOW COLUMNS FROM events LIKE 'promo_video_urls'");
  console.log("promo_video_urls column:", cols.length ? cols[0].Type : "MISSING");

  const [rows] = await conn.query(
    "SELECT id, title, status, promo_video_urls, gallery_image_urls FROM events ORDER BY id DESC LIMIT 8"
  );
  console.log("\nRecent events (raw DB):");
  for (const row of rows) {
    console.log({
      id: row.id,
      title: row.title,
      status: row.status,
      promo_type: row.promo_video_urls == null ? "null" : typeof row.promo_video_urls,
      promo_raw: row.promo_video_urls,
      promo_parsed: parsePromoVideoUrls(row.promo_video_urls)
    });
  }

  if (rows[0]) {
    const viaModel = await findEventById(rows[0].id);
    console.log("\nfindEventById promo_video_urls:", viaModel?.promo_video_urls);
  }

  const testUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
  const testVal = promoVideoUrlsDbValue([testUrl]);
  console.log("\nTest serialize:", testVal);

  await conn.end();
}

main().catch((err) => {
  console.error("FAILED:", err.message);
  process.exit(1);
});
