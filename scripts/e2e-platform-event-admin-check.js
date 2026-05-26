/**
 * Local-only E2E (not for production hosts):
 * - Spawns THIS repo's API on 127.0.0.1:E2E_PORT (default 5020) — never calls a deployed/production API URL.
 * - Uses DB_* from root .env (use your local / dev database credentials only).
 *
 * Flow: staff-login as organizer → POST /events (ticket_sales_mode: platform) →
 * staff-login as admin → GET /admin/listings?type=events&id=… → assert mode → optional cleanup.
 *
 *   npm run e2e:platform-event
 *
 * Test accounts (staff login at http://localhost:5173/admin or your Vite URL):
 *   Organizer: bmte2e.organizer@local.test
 *   Admin: bmte2e.admin@local.test
 *   Password: E2E_Test_2026!
 * Set E2E_KEEP=1 to skip deleting the created event (manual check in local admin UI).
 *
 * Attach to an API you already started locally (no child process, typical PORT=5000):
 *   E2E_ATTACH=http://127.0.0.1:5000 npm run e2e:platform-event
 * (Only http://127.0.0.1:* or http://localhost:* allowed.)
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });
const { spawn } = require("child_process");
const path = require("path");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2/promise");

const REPO_ROOT = path.resolve(__dirname, "..");
const PORT = String(process.env.E2E_PORT || "5020").trim() || "5020";

/** Resolved in assertLocalE2ESafe / main */
let BASE = `http://127.0.0.1:${PORT}`;
let attachMode = false;
let childProcess = null;

function assertLocalE2ESafe() {
  const bad = String(process.env.E2E_BASE_URL || "").trim();
  if (bad) {
    throw new Error("E2E_BASE_URL is not supported. Use E2E_ATTACH=http://127.0.0.1:5000 for a local server, or omit for self-spawn on E2E_PORT.");
  }
  const attach = String(process.env.E2E_ATTACH || "").trim().replace(/\/+$/, "");
  if (attach) {
    let u;
    try {
      u = new URL(attach);
    } catch {
      throw new Error("E2E_ATTACH must be a valid URL, e.g. http://127.0.0.1:5000");
    }
    if (u.protocol !== "http:") {
      throw new Error("E2E_ATTACH must use http: (local only).");
    }
    const host = u.hostname.toLowerCase();
    if (host !== "127.0.0.1" && host !== "localhost") {
      throw new Error("E2E_ATTACH hostname must be 127.0.0.1 or localhost only.");
    }
    BASE = `${u.protocol}//${u.host}`;
    attachMode = true;
  } else {
    BASE = `http://127.0.0.1:${PORT}`;
    attachMode = false;
  }
  const host = String(process.env.DB_HOST || "").trim().toLowerCase();
  const localDb =
    host === "" ||
    host === "127.0.0.1" ||
    host === "localhost" ||
    host === "0.0.0.0" ||
    host.endsWith(".local");
  if (!localDb && process.env.E2E_SKIP_DB_HOST_CHECK !== "1") {
    // eslint-disable-next-line no-console
    console.warn(
      "[e2e] DB_HOST is not localhost. If that is a shared/production database, stop and use a dev DB only. Set E2E_SKIP_DB_HOST_CHECK=1 to silence this warning."
    );
  }
}

const ORG_EMAIL = "bmte2e.organizer@local.test";
const ADMIN_EMAIL = "bmte2e.admin@local.test";
const PASS = "E2E_Test_2026!";

function buildSsl() {
  if (process.env.DB_SSL !== "true") {
    return undefined;
  }
  return {
    minVersion: "TLSv1.2",
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false"
  };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHealth() {
  for (let i = 0; i < 60; i++) {
    try {
      const r = await fetch(`${BASE}/health`);
      if (r.ok) {
        return;
      }
    } catch {
      /* retry */
    }
    await sleep(250);
  }
  throw new Error(`API did not become healthy at ${BASE}/health`);
}

async function jsonFetch(url, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  const res = await fetch(url, { ...options, headers });
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { _raw: text };
  }
  return { res, body };
}

async function staffLogin(email, password) {
  const { res, body } = await jsonFetch(`${BASE}/auth/login/staff`, {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  if (!res.ok) {
    throw new Error(`login failed ${res.status}: ${JSON.stringify(body)}`);
  }
  const token = body?.data?.accessToken;
  if (!token) {
    throw new Error(`login missing accessToken: ${JSON.stringify(body)}`);
  }
  return token;
}

async function main() {
  assertLocalE2ESafe();
  const hash = await bcrypt.hash(PASS, 12);
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: buildSsl()
  });

  let cityId;
  let categoryId;
  try {
    await conn.query(
      `INSERT INTO users (name, email, password_hash, role, organizer_enabled, can_post_events, is_active)
       VALUES ('E2E Organizer', ?, ?, 'user', 1, 1, 1)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), organizer_enabled = 1, can_post_events = 1, role = 'user', is_active = 1`,
      [ORG_EMAIL, hash]
    );
    await conn.query(
      `INSERT INTO users (name, email, password_hash, role, organizer_enabled, can_post_events, is_active)
       VALUES ('E2E Admin', ?, ?, 'admin', 0, 1, 1)
       ON DUPLICATE KEY UPDATE password_hash = VALUES(password_hash), role = 'admin', is_active = 1`,
      [ADMIN_EMAIL, hash]
    );

    const [[c]] = await conn.query("SELECT id FROM cities ORDER BY id ASC LIMIT 1");
    let [catRows] = await conn.query(
      "SELECT id FROM categories WHERE module_type = 'event' ORDER BY id ASC LIMIT 1"
    );
    let cat = catRows[0];
    if (!cat?.id) {
      [catRows] = await conn.query("SELECT id FROM categories ORDER BY id ASC LIMIT 1");
      cat = catRows[0];
    }
    if (!c?.id || !cat?.id) {
      throw new Error("Need at least one city and one category. Run migrations/seed.");
    }
    cityId = Number(c.id);
    categoryId = Number(cat.id);
  } finally {
    await conn.end();
  }

  let stderrBuf = "";

  if (!attachMode) {
    childProcess = spawn(process.execPath, ["src/server.js"], {
      cwd: REPO_ROOT,
      env: { ...process.env, PORT },
      stdio: ["ignore", "pipe", "pipe"]
    });
    childProcess.stderr.on("data", (d) => {
      stderrBuf += d.toString();
    });
  }

  let createdEventId = null;
  try {
    await waitForHealth();

    const orgToken = await staffLogin(ORG_EMAIL, PASS);
    const suffix = Date.now();
    const eventBody = {
      title: `E2E platform checkout ${suffix}`,
      description: "Automated E2E — on-site ticket mode.",
      event_date: "2026-12-15",
      schedule_type: "single",
      event_time: "18:30",
      venue: "E2E Venue Name",
      venue_name: "E2E Venue Name",
      city_id: cityId,
      category_id: categoryId,
      ticket_sales_mode: "platform",
      price: 0
    };

    const createRes = await jsonFetch(`${BASE}/events`, {
      method: "POST",
      headers: { Authorization: `Bearer ${orgToken}` },
      body: JSON.stringify(eventBody)
    });
    if (!createRes.res.ok) {
      throw new Error(`POST /events failed ${createRes.res.status}: ${JSON.stringify(createRes.body)}`);
    }
    const eventId = createRes.body?.data?.eventId;
    if (!eventId) {
      throw new Error(`POST /events missing eventId: ${JSON.stringify(createRes.body)}`);
    }
    createdEventId = Number(eventId);

    const adminToken = await staffLogin(ADMIN_EMAIL, PASS);
    const listUrl = `${BASE}/admin/listings?type=events&id=${createdEventId}`;
    const listRes = await jsonFetch(listUrl, {
      method: "GET",
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    if (!listRes.res.ok) {
      throw new Error(`GET admin/listings failed ${listRes.res.status}: ${JSON.stringify(listRes.body)}`);
    }
    const rows = Array.isArray(listRes.body?.data) ? listRes.body.data : [];
    const row = rows.find((r) => Number(r.id) === createdEventId);
    if (!row) {
      throw new Error(`Admin listing missing event ${createdEventId}: ${JSON.stringify(listRes.body)}`);
    }
    const mode = String(row.ticket_sales_mode || "").toLowerCase();
    if (mode !== "platform") {
      throw new Error(`Expected ticket_sales_mode platform, got ${JSON.stringify(row.ticket_sales_mode)}`);
    }

    // eslint-disable-next-line no-console
    console.log("E2E OK: created pending event", createdEventId, "admin sees ticket_sales_mode=", row.ticket_sales_mode);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("E2E_FAIL", err.message);
    if (stderrBuf.trim()) {
      // eslint-disable-next-line no-console
      console.error("SERVER_STDERR_TAIL\n", stderrBuf.slice(-4000));
    }
    process.exitCode = 1;
  } finally {
    if (createdEventId && process.env.E2E_KEEP !== "1") {
      const c2 = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: Number(process.env.DB_PORT),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        ssl: buildSsl()
      });
      try {
        await c2.query("DELETE FROM events WHERE id = ?", [createdEventId]);
        // eslint-disable-next-line no-console
        console.log("Cleaned up event id", createdEventId);
      } catch (delErr) {
        // eslint-disable-next-line no-console
        console.error("Cleanup failed:", delErr.message);
      } finally {
        await c2.end();
      }
    } else if (createdEventId && process.env.E2E_KEEP === "1") {
      // eslint-disable-next-line no-console
      console.log("E2E_KEEP=1 — left event id", createdEventId, "in DB for manual admin UI check.");
    }
    if (childProcess) {
      childProcess.kill("SIGTERM");
      await sleep(400);
      if (!childProcess.killed) {
        try {
          process.kill(childProcess.pid, "SIGKILL");
        } catch {
          /* ignore */
        }
      }
    }
  }
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
