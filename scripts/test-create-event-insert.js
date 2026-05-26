require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

function buildSsl() {
  if (process.env.DB_SSL !== "true") return undefined;
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

  const sql = `INSERT INTO events
      (title, description, event_date, schedule_type, event_start_date, event_end_date, event_dates_json, event_time, venue, city_id, category_id,
       venue_name, venue_address, google_maps_link, organizer_id, ticket_link, ticket_sales_mode, total_seats,
       image_url, gallery_image_urls, price, ticket_levels_json, duration_hours, duration_minutes, age_limit, languages, genres, event_highlights,
       is_yay_deal_event, deal_event_discount_code,
       status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', NOW(), NOW())`;

  const vals = new Array(30).fill("x");
  try {
    await conn.beginTransaction();
    await conn.query(sql, vals);
    await conn.rollback();
    console.log("30 placeholders: INSERT shape OK (rolled back)");
  } catch (e) {
    console.log("INSERT error:", e.code, e.message);
  }

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
