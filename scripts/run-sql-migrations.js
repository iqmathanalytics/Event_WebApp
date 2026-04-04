/**
 * Run SQL migration files in order against DB_* env vars.
 * Usage: set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME, optional DB_SSL=true, DB_SSL_REJECT_UNAUTHORIZED=false
 *
 * For an empty database, run once with --bootstrap (runs bootstrap_schema.sql first, then migrations).
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const withBootstrap =
  process.argv.includes("--bootstrap") || process.env.DB_INCLUDE_BOOTSTRAP === "true";

const FILES = [
  ...(withBootstrap ? ["bootstrap_schema.sql"] : []),
  "cities_categories_expansion.sql",
  "user_capabilities_and_content_fields_migration.sql",
  "organizer_enabled_migration.sql",
  "event_click_view_counts.sql",
  "deal_click_view_counts.sql",
  "deal_offer_fields.sql",
  "user_onboarding_profiles.sql",
  "dealer_profiles.sql",
  "influencer_deal_review_notes.sql",
  "event_manual_one_of_a_kind_flag.sql",
  "event_yay_deal_fields.sql",
  "google_oauth_users.sql",
  "influencer_premium_gallery_and_metrics.sql",
  "influencer_engagement_timestamp.sql",
  "event_gallery_image_urls.sql",
  "newsletter_guest_columns.sql",
  "newsletter_email_unique.sql",
  "newsletter_user_id.sql"
];

function buildSsl() {
  if (process.env.DB_SSL !== "true") {
    return undefined;
  }
  return {
    minVersion: "TLSv1.2",
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"
  };
}

async function runFile(conn, relPath) {
  const sqlPath = path.resolve(__dirname, "..", "sql", relPath);
  if (!fs.existsSync(sqlPath)) {
    // eslint-disable-next-line no-console
    console.warn(`skip missing: ${relPath}`);
    return;
  }
  const raw = fs.readFileSync(sqlPath, "utf8");
  const statements = raw
    .split(/;\s*(?:\r?\n|$)/)
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    try {
      await conn.query(stmt);
    } catch (err) {
      const msg = String(err?.message || "");
      const errno = err?.errno;
      if (
        msg.includes("Duplicate column") ||
        msg.includes("already exists") ||
        msg.includes("Duplicate key name") ||
        errno === 1091 ||
        msg.includes("check that column/key exists")
      ) {
        continue;
      }
      throw err;
    }
  }
  // eslint-disable-next-line no-console
  console.log(`ok: ${relPath}`);
}

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: buildSsl()
  });
  try {
    for (const f of FILES) {
      await runFile(conn, f);
    }
    // eslint-disable-next-line no-console
    console.log("All migration files processed.");
  } finally {
    await conn.end();
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
