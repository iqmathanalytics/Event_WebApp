/**
 * Validate production .env before MilesWeb deploy (run on server or locally with production .env).
 *   node scripts/verify-production-env.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });

const REQUIRED = [
  "NODE_ENV",
  "PORT",
  "DB_HOST",
  "DB_PORT",
  "DB_USER",
  "DB_PASSWORD",
  "DB_NAME",
  "JWT_ACCESS_SECRET",
  "JWT_ACCESS_EXPIRES_IN",
  "JWT_REFRESH_SECRET",
  "JWT_REFRESH_EXPIRES_IN",
  "CORS_ORIGIN"
];

const RECOMMENDED = [
  { key: "FRONTEND_URL", hint: "Links in Brevo emails" },
  { key: "PUBLIC_APP_URL", hint: "Public site URL (fallback for emails)" },
  { key: "BREVO_API_KEY", hint: "Transactional email" },
  { key: "BREVO_FROM_EMAIL", hint: "Verified sender in Brevo" },
  { key: "GOOGLE_CLIENT_ID", hint: "Google Sign-In (match frontend VITE_GOOGLE_CLIENT_ID)" },
  { key: "CLOUDINARY_CLOUD_NAME", hint: "Image uploads" },
  { key: "STRIPE_SECRET_KEY", hint: "Platform ticket checkout" },
  { key: "STRIPE_WEBHOOK_SECRET", hint: "Stripe webhooks at /webhooks/stripe" },
  { key: "GA4_PROPERTY_ID", hint: "Organizer Insights" },
  { key: "GA_SERVICE_ACCOUNT_JSON", hint: "GA4 Data API" },
  { key: "CSC_API_KEY", hint: "US city catalog sync" }
];

const WEAK_JWT = new Set(["changeme", "secret", "replace-with-strong-secret", "your-secret"]);

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  process.exitCode = 1;
}

function warn(msg) {
  console.warn(`WARN: ${msg}`);
}

function ok(msg) {
  console.log(`OK: ${msg}`);
}

let errors = 0;

for (const key of REQUIRED) {
  const val = String(process.env[key] || "").trim();
  if (!val) {
    fail(`Missing required: ${key}`);
    errors += 1;
  }
}

if (process.env.NODE_ENV !== "production") {
  warn('NODE_ENV is not "production" — set NODE_ENV=production on the server');
}

for (const secretKey of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"]) {
  const v = String(process.env[secretKey] || "").trim();
  if (v && (v.length < 32 || WEAK_JWT.has(v.toLowerCase()))) {
    fail(`${secretKey} must be at least 32 characters and not a placeholder`);
    errors += 1;
  }
}

if (process.env.JWT_ACCESS_SECRET && process.env.JWT_REFRESH_SECRET) {
  if (process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET) {
    warn("JWT_ACCESS_SECRET and JWT_REFRESH_SECRET should differ");
  }
}

const cors = String(process.env.CORS_ORIGIN || "");
if (cors === "*" || !cors) {
  fail("CORS_ORIGIN must list explicit origins (comma-separated), not *");
  errors += 1;
} else if (process.env.NODE_ENV === "production" && cors.includes("localhost")) {
  warn("CORS_ORIGIN includes localhost — remove for production unless intentional");
}

if (process.env.DB_SSL !== "true" && process.env.DB_SSL !== "false") {
  warn('Set DB_SSL=true or DB_SSL=false explicitly for production');
}

for (const { key, hint } of RECOMMENDED) {
  if (!String(process.env[key] || "").trim()) {
    warn(`Optional but recommended: ${key} — ${hint}`);
  }
}

if (errors === 0) {
  ok("Required environment variables present");
  if (process.exitCode) {
    console.log("\nFix warnings above before go-live if those features are needed.");
  } else {
    console.log("\nReady for production startup (npm start).");
  }
} else {
  console.error(`\n${errors} required issue(s). Fix .env and re-run.`);
  process.exit(1);
}
