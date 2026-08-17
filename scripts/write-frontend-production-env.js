/**
 * Write gitignored frontend/.env.production for Vite production builds.
 * Keeps frontend/.env pointed at localhost for `npm run dev`.
 */
const fs = require("fs");
const path = require("path");

const frontendDir = path.resolve(__dirname, "..", "frontend");
const localEnvPath = path.join(frontendDir, ".env");
const prodEnvPath = path.join(frontendDir, ".env.production");
const PROD_API = "https://www.bookmytickets.us/api";

function parseEnv(text) {
  const out = {};
  String(text || "")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        return;
      }
      const eq = trimmed.indexOf("=");
      if (eq < 1) {
        return;
      }
      out[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
    });
  return out;
}

const local = fs.existsSync(localEnvPath) ? parseEnv(fs.readFileSync(localEnvPath, "utf8")) : {};
const lines = [
  "# Generated for production Vite builds. Not committed. Local `vite` still uses frontend/.env.",
  `VITE_API_BASE_URL=${PROD_API}`,
  `VITE_GOOGLE_CLIENT_ID=${local.VITE_GOOGLE_CLIENT_ID || ""}`,
  `VITE_STRIPE_PUBLISHABLE_KEY=${local.VITE_STRIPE_PUBLISHABLE_KEY || ""}`,
  `VITE_GA_MEASUREMENT_ID=${local.VITE_GA_MEASUREMENT_ID || ""}`
];

fs.writeFileSync(prodEnvPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Wrote ${prodEnvPath}`);
console.log(`VITE_API_BASE_URL=${PROD_API}`);
console.log("Local frontend/.env is unchanged (localhost for npm run dev).");
