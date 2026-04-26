const {
  getCitySyncMeta,
  updateCitySyncMeta,
  upsertCities,
  listCitiesBySlugs
} = require("../models/cityModel");
const { citySync } = require("../config/env");

const DAY_IN_MS = 24 * 60 * 60 * 1000;
let runningSyncPromise = null;

function slugify(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isStale(lastSyncedAt, days) {
  if (!lastSyncedAt) {
    return true;
  }
  const last = new Date(lastSyncedAt);
  if (Number.isNaN(last.getTime())) {
    return true;
  }
  return Date.now() - last.getTime() >= days * DAY_IN_MS;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "X-CSCAPI-KEY": citySync.apiKey
    }
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`City sync API error ${response.status}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

async function fetchAllUSCitiesFromApi() {
  const states = await fetchJson("https://api.countrystatecity.in/v1/countries/US/states");
  const normalizedStates = Array.isArray(states) ? states : [];
  const cityMap = new Map();

  for (const state of normalizedStates) {
    if (!state?.iso2 || !state?.name) {
      // Skip malformed state rows
      // eslint-disable-next-line no-continue
      continue;
    }
    const stateCode = String(state.iso2).trim().toUpperCase();
    const stateName = String(state.name).trim();
    const cities = await fetchJson(
      `https://api.countrystatecity.in/v1/countries/US/states/${encodeURIComponent(stateCode)}/cities`
    );
    const cityRows = Array.isArray(cities) ? cities : [];
    cityRows.forEach((city) => {
      const cityName = String(city?.name || "").trim();
      if (!cityName) {
        return;
      }
      const slug = `${slugify(cityName)}-${slugify(stateCode)}`;
      if (!slug) {
        return;
      }
      cityMap.set(slug, {
        name: cityName,
        state: stateName,
        slug
      });
    });
  }

  return Array.from(cityMap.values()).sort((a, b) => {
    const nameCompare = a.name.localeCompare(b.name, "en", { sensitivity: "base" });
    if (nameCompare !== 0) {
      return nameCompare;
    }
    return a.state.localeCompare(b.state, "en", { sensitivity: "base" });
  });
}

async function syncUSCitiesIfStale({ force = false } = {}) {
  if (!citySync.apiKey) {
    return { synced: false, reason: "missing_api_key" };
  }

  if (runningSyncPromise) {
    return runningSyncPromise;
  }

  runningSyncPromise = (async () => {
    const meta = await getCitySyncMeta();
    if (!force && !isStale(meta.last_synced_at, citySync.refreshDays)) {
      return { synced: false, reason: "fresh" };
    }

    const cities = await fetchAllUSCitiesFromApi();
    await upsertCities(cities);
    await updateCitySyncMeta(new Date());
    return { synced: true, count: cities.length };
  })()
    .catch((error) => ({ synced: false, reason: "error", error: error.message }))
    .finally(() => {
      runningSyncPromise = null;
    });

  return runningSyncPromise;
}

/** Slugs align with CSC / bootstrap so upserts merge cleanly (one metro per slug). */
const APP_METRO_SEED = [
  { name: "Atlanta", state: "GA", slug: "atlanta-ga" },
  { name: "Austin", state: "TX", slug: "austin-tx" },
  { name: "Dallas", state: "TX", slug: "dallas-tx" },
  { name: "Houston", state: "TX", slug: "houston-tx" },
  { name: "San Antonio", state: "TX", slug: "san-antonio-tx" }
];

const APP_METRO_SLUGS_ORDERED = APP_METRO_SEED.map((r) => r.slug);
const slugOrderIndex = (slug) => {
  const i = APP_METRO_SLUGS_ORDERED.indexOf(String(slug || "").trim());
  return i === -1 ? 999 : i;
};

async function ensureAppMetroCitiesSeeded() {
  try {
    await upsertCities(APP_METRO_SEED);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[cityService] ensureAppMetroCitiesSeeded:", err?.message || err);
  }
}

async function fetchCities({ q, limit } = {}) {
  await ensureAppMetroCitiesSeeded();
  await syncUSCitiesIfStale();

  const query = String(q || "").trim();
  let rows = await listCitiesBySlugs(APP_METRO_SLUGS_ORDERED);

  if (query) {
    const qLower = query.toLowerCase();
    rows = rows.filter((item) => {
      const name = String(item.name || "").toLowerCase();
      const state = String(item.state || "").toLowerCase();
      return name.includes(qLower) || state.includes(qLower) || `${item.name}, ${item.state}`.toLowerCase().includes(qLower);
    });
  }

  const mapped = rows
    .map((item) => ({
      value: String(item.id),
      label: item.name,
      name: item.name,
      state: item.state,
      slug: item.slug
    }))
    .filter((item) => slugOrderIndex(item.slug) < 999)
    .sort((a, b) => slugOrderIndex(a.slug) - slugOrderIndex(b.slug));
  return mapped;
}

module.exports = {
  fetchCities,
  syncUSCitiesIfStale
};
