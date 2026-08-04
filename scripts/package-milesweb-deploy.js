/**
 * Package MilesWeb upload zips (API code + frontend dist).
 * Does not include secrets or node_modules.
 *
 *   node scripts/package-milesweb-deploy.js
 */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const deployDir = path.join(root, "deploy");
const apiZip = path.join(deployDir, "milesweb-api.zip");
const frontendZip = path.join(deployDir, "milesweb-frontend.zip");
const distDir = path.join(root, "frontend", "dist");

function ensureDist() {
  if (!fs.existsSync(path.join(distDir, "index.html"))) {
    throw new Error("frontend/dist missing — run npm run build:frontend first");
  }
  if (!fs.existsSync(path.join(distDir, ".htaccess"))) {
    throw new Error("frontend/dist/.htaccess missing — rebuild frontend");
  }
}

function zipWithPowerShell(sources, outZip, cwd) {
  if (fs.existsSync(outZip)) {
    fs.unlinkSync(outZip);
  }
  const list = sources.map((s) => `"${s}"`).join(", ");
  const script = `Compress-Archive -Path ${list} -DestinationPath "${outZip}" -Force`;
  const res = spawnSync("powershell.exe", ["-NoProfile", "-Command", script], {
    cwd,
    encoding: "utf8"
  });
  if (res.status !== 0) {
    throw new Error(res.stderr || res.stdout || "Compress-Archive failed");
  }
}

fs.mkdirSync(deployDir, { recursive: true });
ensureDist();

zipWithPowerShell(
  ["src", "sql", "scripts", "package.json", "package-lock.json"],
  apiZip,
  root
);

zipWithPowerShell(["*"], frontendZip, distDir);

console.log(`Wrote ${apiZip}`);
console.log(`Wrote ${frontendZip}`);
console.log(`Env file: ${path.join(deployDir, "milesweb-api.env")} (upload as .env — do not zip into public)`);
console.log(`
MilesWeb:
  1) Extract milesweb-api.zip into Node application root (overwrite src/, sql/, package*.json)
  2) Restart Node app (and NPM Install if package.json changed)
  3) Extract milesweb-frontend.zip into public_html / www document root (overwrite)
`);
