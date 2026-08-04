/**
 * Upload MilesWeb packages via FTP using credentials from .env:
 *   MILESWEB_FTP_HOST
 *   MILESWEB_FTP_USER
 *   MILESWEB_FTP_PASSWORD
 *   MILESWEB_FTP_API_DIR     (e.g. /home/USER/api.bookmytickets.us or relative path)
 *   MILESWEB_FTP_WEB_DIR     (e.g. /home/USER/public_html or /public_html)
 *
 *   node scripts/deploy-milesweb-ftp.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = path.resolve(__dirname, "..");
const deployDir = path.join(root, "deploy");

function req(name) {
  const v = String(process.env[name] || "").trim();
  if (!v) {
    throw new Error(`Missing ${name} in .env`);
  }
  return v;
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, { encoding: "utf8", ...opts });
  if (res.status !== 0) {
    throw new Error((res.stderr || res.stdout || `${cmd} failed`).trim());
  }
  return res.stdout;
}

async function main() {
  const host = req("MILESWEB_FTP_HOST");
  const user = req("MILESWEB_FTP_USER");
  const password = req("MILESWEB_FTP_PASSWORD");
  const apiDir = req("MILESWEB_FTP_API_DIR");
  const webDir = req("MILESWEB_FTP_WEB_DIR");
  const port = Number(process.env.MILESWEB_FTP_PORT || 21);

  // Ensure packages exist
  run(process.execPath, [path.join(__dirname, "package-milesweb-deploy.js")], { cwd: root, stdio: "inherit" });

  let ftp;
  try {
    // eslint-disable-next-line import/no-extraneous-dependencies, global-require
    ftp = require("basic-ftp");
  } catch (_err) {
    console.log("Installing basic-ftp locally…");
    run("npm", ["install", "basic-ftp", "--no-save"], { cwd: root, stdio: "inherit" });
    // eslint-disable-next-line global-require
    ftp = require("basic-ftp");
  }

  const client = new ftp.Client(120000);
  client.ftp.verbose = true;
  try {
    console.log(`Connecting FTP ${host}:${port} as ${user}…`);
    await client.access({
      host,
      port,
      user,
      password,
      secure: process.env.MILESWEB_FTP_SECURE === "true"
    });

    console.log(`Uploading API zip → ${apiDir}`);
    await client.ensureDir(apiDir);
    await client.uploadFrom(path.join(deployDir, "milesweb-api.zip"), path.posix.join(apiDir.replace(/\\/g, "/"), "milesweb-api.zip"));

    const envPath = path.join(deployDir, "milesweb-api.env");
    if (fs.existsSync(envPath)) {
      console.log("Uploading milesweb-api.env as .env (API root)");
      await client.uploadFrom(envPath, path.posix.join(apiDir.replace(/\\/g, "/"), ".env"));
    }

    console.log(`Uploading frontend zip → ${webDir}`);
    await client.ensureDir(webDir);
    await client.uploadFrom(
      path.join(deployDir, "milesweb-frontend.zip"),
      path.posix.join(webDir.replace(/\\/g, "/"), "milesweb-frontend.zip")
    );

    console.log(`
FTP upload done.

On MilesWeb File Manager / SSH still required once:
  1) In API dir: extract milesweb-api.zip (overwrite), then Restart Node app
  2) In web dir: extract milesweb-frontend.zip (overwrite) into document root
  3) Delete the zip files after extract
`);
  } finally {
    client.close();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
