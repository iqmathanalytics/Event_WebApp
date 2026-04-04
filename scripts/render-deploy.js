/**
 * Trigger a Render deploy for the backend web service.
 *
 * Usage (PowerShell):
 *   $env:RENDER_API_KEY = "rnd_..."   # Account → API keys (never commit)
 *   $env:RENDER_SERVICE_ID = "srv-..." # optional if name match works
 *   npm run deploy:render
 *
 * Or set RENDER_SERVICE_NAME=yay-tickets-api (default) to pick service by name.
 * You can also put RENDER_API_KEY in the repo root `.env` (never commit it).
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "..", ".env") });

const API = "https://api.render.com/v1";

const token = process.env.RENDER_API_KEY;
const explicitId = process.env.RENDER_SERVICE_ID;
const serviceName = (process.env.RENDER_SERVICE_NAME || "yay-tickets-api").trim();

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...opts.headers
    }
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  if (!res.ok) {
    const err = new Error(typeof data === "string" ? data : JSON.stringify(data));
    err.status = res.status;
    throw err;
  }
  return data;
}

async function listServices(cursor) {
  const q = new URLSearchParams({ limit: "100" });
  if (cursor) q.set("cursor", cursor);
  return api(`/services?${q}`);
}

function normalizeList(page) {
  if (Array.isArray(page)) return page;
  if (Array.isArray(page?.items)) return page.items;
  if (Array.isArray(page?.services)) return page.services;
  if (Array.isArray(page?.service)) return page.service;
  return [];
}

function pickName(s) {
  return s?.name ?? s?.service?.name ?? "";
}

function pickId(s) {
  return s?.id ?? s?.service?.id ?? null;
}

async function findServiceId() {
  if (explicitId) return explicitId;

  const seen = new Set();
  let cursor;
  do {
    const page = await listServices(cursor);
    const list = normalizeList(page);
    const match = list.find((s) => pickName(s) === serviceName);
    if (match) return pickId(match);
    for (const s of list) {
      const id = pickId(s);
      if (id) seen.add(`${pickName(s)} (${id})`);
    }
    cursor = page?.cursor;
  } while (cursor);

  if (seen.size) {
    console.error("Services visible to this API key:");
    for (const line of seen) console.error(" ", line);
  }
  return null;
}

async function main() {
  if (!token) {
    console.error("Missing RENDER_API_KEY (set in shell, do not commit).");
    process.exit(1);
  }

  const serviceId = await findServiceId();
  if (!serviceId) {
    console.error(
      `No service found named "${serviceName}". Create the Web Service in Render first, or set RENDER_SERVICE_ID=srv-...`
    );
    process.exit(1);
  }

  const body = {};
  if (process.env.RENDER_CLEAR_CACHE === "true") {
    body.clearCache = "clear";
  }

  const deploy = await api(`/services/${serviceId}/deploys`, {
    method: "POST",
    body: JSON.stringify(body)
  });

  console.log("Deploy started:", JSON.stringify(deploy, null, 2));
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
