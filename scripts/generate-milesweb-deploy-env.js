/**
 * Write MilesWeb Node.js .env (TiDB production + app secrets). Not committed.
 *   node scripts/generate-milesweb-deploy-env.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");

const outDir = path.resolve(__dirname, "..", "deploy");
const outFile = path.join(outDir, "milesweb-api.env");

function req(name) {
  const v = process.env[name];
  if (!v || !String(v).trim()) {
    throw new Error(`Missing ${name} in .env`);
  }
  return String(v).trim();
}

function opt(name, fallback = "") {
  const v = process.env[name];
  return v != null && String(v).trim() ? String(v).trim() : fallback;
}

const lines = [
  "# Upload as .env in MilesWeb Node.js application root (API host)",
  "NODE_ENV=production",
  "PORT=5000",
  "",
  "# TiDB Cloud production (same as npm run db:migrate:production)",
  `DB_HOST=${req("PRODUCTION_DB_HOST")}`,
  `DB_PORT=${opt("PRODUCTION_DB_PORT", "4000")}`,
  `DB_USER=${req("PRODUCTION_DB_USER")}`,
  `DB_PASSWORD=${req("PRODUCTION_DB_PASSWORD")}`,
  `DB_NAME=${opt("PRODUCTION_DB_NAME", "test")}`,
  `DB_SSL=${opt("PRODUCTION_DB_SSL", "true")}`,
  "",
  `JWT_ACCESS_SECRET=${req("JWT_ACCESS_SECRET")}`,
  `JWT_ACCESS_EXPIRES_IN=${req("JWT_ACCESS_EXPIRES_IN")}`,
  `JWT_REFRESH_SECRET=${req("JWT_REFRESH_SECRET")}`,
  `JWT_REFRESH_EXPIRES_IN=${req("JWT_REFRESH_EXPIRES_IN")}`,
  "",
  `CORS_ORIGIN=${req("CORS_ORIGIN")}`,
  "TRUST_PROXY_HOPS=1",
  `APP_TIMEZONE=${opt("APP_TIMEZONE", "America/New_York")}`,
  `GA4_REPORTING_TIMEZONE=${opt("GA4_REPORTING_TIMEZONE", opt("APP_TIMEZONE", "America/New_York"))}`,
  "",
  `# Must match frontend VITE_GOOGLE_CLIENT_ID (same OAuth client)`,
  `GOOGLE_CLIENT_ID=${req("GOOGLE_CLIENT_ID")}`,
  `FRONTEND_URL=${opt("FRONTEND_URL", "https://bookmytickets.us")}`,
  `PUBLIC_APP_URL=${opt("PUBLIC_APP_URL", "https://bookmytickets.us")}`,
  `PUBLIC_API_URL=${opt("PUBLIC_API_URL", `${opt("PUBLIC_APP_URL", "https://bookmytickets.us")}/api`)}`,
  "",
  `BREVO_API_KEY=${opt("BREVO_API_KEY")}`,
  `BREVO_FROM_EMAIL=${opt("BREVO_FROM_EMAIL")}`,
  `BREVO_FROM_NAME=${opt("BREVO_FROM_NAME", "Book My Tickets")}`,
  `ADMIN_CONTACT_EMAIL=${opt("ADMIN_CONTACT_EMAIL", opt("BREVO_FROM_EMAIL"))}`,
  "",
  `CLOUDINARY_CLOUD_NAME=${opt("CLOUDINARY_CLOUD_NAME")}`,
  `CLOUDINARY_API_KEY=${opt("CLOUDINARY_API_KEY")}`,
  `CLOUDINARY_API_SECRET=${opt("CLOUDINARY_API_SECRET")}`,
  `CLOUDINARY_UPLOAD_FOLDER=${opt("CLOUDINARY_UPLOAD_FOLDER", "bookmytickets")}`,
  "",
  `STRIPE_SECRET_KEY=${opt("STRIPE_SECRET_KEY")}`,
  `STRIPE_PUBLISHABLE_KEY=${opt("STRIPE_PUBLISHABLE_KEY")}`,
  `STRIPE_WEBHOOK_SECRET=${opt("STRIPE_WEBHOOK_SECRET")}`,
  "",
  `GA4_PROPERTY_ID=${opt("GA4_PROPERTY_ID")}`,
  `GA_SERVICE_ACCOUNT_JSON=${opt("GA_SERVICE_ACCOUNT_JSON")}`,
  "",
  `CSC_API_KEY=${opt("CSC_API_KEY")}`,
  `CITY_SYNC_REFRESH_DAYS=${opt("CITY_SYNC_REFRESH_DAYS", "30")}`,
  "",
  `MAILCHIMP_API_KEY=${opt("MAILCHIMP_API_KEY")}`,
  `MAILCHIMP_LIST_ID=${opt("MAILCHIMP_LIST_ID")}`,
  `MAILCHIMP_SERVER_PREFIX=${opt("MAILCHIMP_SERVER_PREFIX")}`,
  "",
  `YOUTUBE_API_KEY=${opt("YOUTUBE_API_KEY")}`,
  `RATE_LIMIT_DISABLED=${opt("RATE_LIMIT_DISABLED", "false")}`
];

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${outFile}`);
console.log("Upload this file as .env on MilesWeb Node app root.");
