/**
 * Merge local .env into Render web service env (PUT replaces all — build full map).
 * Usage: RENDER_API_KEY=rnd_... RENDER_SERVICE_ID=srv-... node scripts/sync-render-env-from-local.js
 * Does not print secret values.
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });

const SERVICE_ID = process.env.RENDER_SERVICE_ID || "srv-d6s40smuk2gs7381u2u0";
const TOKEN = process.env.RENDER_API_KEY;

const SYNC_KEYS = [
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "DB_SSL",
  "DB_SSL_REJECT_UNAUTHORIZED",
  "JWT_ACCESS_SECRET",
  "JWT_ACCESS_EXPIRES_IN",
  "JWT_REFRESH_SECRET",
  "JWT_REFRESH_EXPIRES_IN",
  "CORS_ORIGIN",
  "GOOGLE_CLIENT_ID",
  "CSC_API_KEY",
  "CITY_SYNC_REFRESH_DAYS",
  "SENDGRID_API_KEY",
  "SENDGRID_FROM_EMAIL",
  "SENDGRID_FROM_NAME",
  "ADMIN_CONTACT_EMAIL",
  "ADMIN_NOTIFICATION_EMAIL",
  "MAILCHIMP_API_KEY",
  "MAILCHIMP_LIST_ID",
  "MAILCHIMP_SERVER_PREFIX"
];

async function main() {
  if (!TOKEN) {
    console.error("Set RENDER_API_KEY");
    process.exit(1);
  }

  const listRes = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/env-vars`, {
    headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/json" }
  });
  if (!listRes.ok) {
    console.error("GET env-vars failed", listRes.status, await listRes.text());
    process.exit(1);
  }
  const listJson = await listRes.json();
  const merged = {};
  for (const row of listJson.envVars || listJson.value || []) {
    const ev = row.envVar || row;
    if (ev?.key) {
      merged[ev.key] = ev.value;
    }
  }

  const applied = [];
  for (const key of SYNC_KEYS) {
    const raw = process.env[key];
    if (raw !== undefined && String(raw).trim() !== "") {
      merged[key] = String(raw).trim();
      applied.push(key);
    }
  }

  merged.NODE_ENV = "production";
  if (!merged.PORT) {
    merged.PORT = "10000";
  }

  const envVars = Object.entries(merged).map(([key, value]) => ({
    key,
    value: value === undefined || value === null ? "" : String(value)
  }));

  // Bulk replace: body is the array of { key, value } (see Render API).
  const payload = JSON.stringify(envVars);
  const putRes = await fetch(`https://api.render.com/v1/services/${SERVICE_ID}/env-vars`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
      "Content-Type": "application/json"
    },
    body: payload
  });
  if (!putRes.ok) {
    console.error("PUT env-vars failed", putRes.status, await putRes.text());
    process.exit(1);
  }
  console.log("Render env updated. Keys from local .env applied:", applied.join(", ") || "(none non-empty)");
  console.log("Total env vars on service:", envVars.length);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
