/**
 * Pre-deploy helper: verify env + print MilesWeb upload checklist.
 *   node scripts/prepare-production-deploy.js
 */
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const frontendDist = path.join(root, "frontend", "dist");
const frontendEnv = path.join(root, "frontend", ".env");

console.log("=== Book My Tickets — production deploy prep ===\n");

const verify = spawnSync(process.execPath, [path.join(__dirname, "verify-production-env.js")], {
  cwd: root,
  stdio: "inherit",
  env: process.env
});

if (verify.status !== 0) {
  process.exit(verify.status || 1);
}

console.log("\n--- Frontend build ---");
if (!fs.existsSync(frontendEnv)) {
  console.warn("WARN: frontend/.env missing — copy frontend/.env.production.example → frontend/.env");
  console.warn("      Set VITE_API_BASE_URL before npm run build:frontend\n");
} else {
  const envText = fs.readFileSync(frontendEnv, "utf8");
  if (!/VITE_API_BASE_URL\s*=\s*https?:\/\//m.test(envText)) {
    console.warn("WARN: frontend/.env should set VITE_API_BASE_URL to your live API URL");
  }
}

if (fs.existsSync(frontendDist)) {
  console.log("OK: frontend/dist exists (run npm run build:frontend to refresh)");
} else {
  console.log("INFO: Run on your PC: npm run build:frontend");
}

console.log(`
--- Upload checklist (MilesWeb mPanel) ---

API (Node.js app — e.g. api.bookmytickets.us):
  • package.json, package-lock.json
  • src/   scripts/   sql/
  • .env (production values — never commit)
  • On server: npm install --omit=dev && restart Node app
  • Startup file: src/server.js
  • Test: https://YOUR-API-HOST/api/health

Website (main domain document root):
  • Upload ALL files inside frontend/dist/ (includes .htaccess)
  • Rebuild after every change to frontend/.env

Database (once per environment):
  • npm run db:migrate              (local TiDB)
  • npm run db:migrate:production   (production TiDB — includes event_seatsio.sql)
  • npm run db:backfill-slugs

Reserved seating (Seats.io):
  • Set SEATSIO_SECRET_KEY + SEATSIO_WORKSPACE_KEY + SEATSIO_REGION in API .env
  • Do not swap secret vs workspace keys (see .env.production.example)
  • Organizer: platform event → Reserved seating → Design chart → Publish → Save

Full guide: docs/MILESWEB-DEPLOY.md
Quick list: docs/PRODUCTION-CHECKLIST.md
`);
