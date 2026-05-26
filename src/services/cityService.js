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
  { name: "San Antonio", state: "TX", slug: "san-antonio-tx" },
  { name: "Simi Valley", state: "CA", slug: "simi-valley-ca" },
  { name: "Boise", state: "ID", slug: "boise-id" },
  { name: "Phoenix", state: "AZ", slug: "phoenix-az" },
  { name: "San Francisco", state: "CA", slug: "san-francisco-ca" },
  { name: "Ashburn", state: "VA", slug: "ashburn-va" },
  { name: "Raleigh", state: "NC", slug: "raleigh-nc" }
];

const APP_METRO_SLUGS_ORDERED = APP_METRO_SEED.map((r) => r.slug);

/** Catch-all city for global dropdowns and forms (slug must match frontend `OTHERS_CITY_SLUG`). */
const OTHERS_CITY = { name: "Others", state: "US", slug: "others-us" };
const OTHERS_CITY_SLUG = OTHERS_CITY.slug;

const slugOrderIndex = (slug) => {
  const normalized = String(slug || "").trim();
  if (normalized === OTHERS_CITY_SLUG) {
    return 1000;
  }
  const i = APP_METRO_SLUGS_ORDERED.indexOf(normalized);
  return i === -1 ? 999 : i;
};

function formatCityLabel(item) {
  if (String(item?.slug || "").trim() === OTHERS_CITY_SLUG) {
    return "Others";
  }
  return item?.state ? `${item.name}, ${item.state}` : String(item?.name || "");
}

async function ensureAppMetroCitiesSeeded() {
  try {
    await upsertCities(APP_METRO_SEED);
    const { pool } = require("../config/db");
    const slugs = [...APP_METRO_SLUGS_ORDERED, OTHERS_CITY_SLUG];
    const placeholders = slugs.map(() => "?").join(", ");
    await pool.query(
      `UPDATE cities SET show_in_dropdown = 1 WHERE slug IN (${placeholders})`,
      slugs
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[cityService] ensureAppMetroCitiesSeeded:", err?.message || err);
  }
}

async function ensureOthersCitySeeded() {
  try {
    await upsertCities([OTHERS_CITY]);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn("[cityService] ensureOthersCitySeeded:", err?.message || err);
  }
}

async function fetchCities({ q, limit } = {}) {
  await ensureAppMetroCitiesSeeded();
  await ensureOthersCitySeeded();
  if (String(process.env.CITY_SYNC_FULL_US || "").toLowerCase() === "true") {
    await syncUSCitiesIfStale();
  }

  const query = String(q || "").trim();
  const { listDropdownCities } = require("../models/cityModel");
  let rows = await listDropdownCities({ q: query, limit });

  const mapped = rows
    .map((item) => ({
      value: String(item.id),
      label: formatCityLabel(item),
      name: item.name,
      state: item.state,
      slug: item.slug
    }))
    .sort((a, b) => {
      const orderA = slugOrderIndex(a.slug);
      const orderB = slugOrderIndex(b.slug);
      if (orderA !== orderB) {
        return orderA - orderB;
      }
      return a.label.localeCompare(b.label, "en", { sensitivity: "base" });
    });
  return mapped;
}

async function listAdminDropdownCities() {
  await ensureAppMetroCitiesSeeded();
  await ensureOthersCitySeeded();
  const { listDropdownCities } = require("../models/cityModel");
  const rows = await listDropdownCities({ limit: 200 });
  return rows.map((item) => ({
    id: item.id,
    name: item.name,
    state: item.state,
    slug: item.slug,
    label: formatCityLabel(item)
  }));
}

async function addAdminDropdownCity({ name, state }) {
  const cityName = String(name || "").trim();
  const stateCode = String(state || "").trim().toUpperCase();
  if (!cityName || !stateCode) {
    const ApiError = require("../utils/ApiError");
    throw new ApiError(400, "City name and state are required.");
  }
  const slug = `${slugify(cityName)}-${slugify(stateCode)}`;
  await upsertCities([{ name: cityName, state: stateCode, slug }]);
  const rows = await listCitiesBySlugs([slug]);
  const row = rows[0];
  if (!row?.id) {
    const ApiError = require("../utils/ApiError");
    throw new ApiError(500, "Could not add city.");
  }
  const { setCityDropdownFlag } = require("../models/cityModel");
  await setCityDropdownFlag(row.id, true);
  return {
    id: row.id,
    name: row.name,
    state: row.state,
    slug: row.slug,
    label: formatCityLabel(row)
  };
}

async function removeAdminDropdownCity(cityId) {
  const { findCityById, setCityDropdownFlag } = require("../models/cityModel");
  const row = await findCityById(cityId);
  if (!row) {
    const ApiError = require("../utils/ApiError");
    throw new ApiError(404, "City not found");
  }
  if (String(row.slug) === OTHERS_CITY_SLUG) {
    const ApiError = require("../utils/ApiError");
    throw new ApiError(400, "The Others city cannot be removed from the dropdown.");
  }
  await setCityDropdownFlag(cityId, false);
  return { id: cityId, removed: true };
}

module.exports = {
  fetchCities,
  syncUSCitiesIfStale,
  OTHERS_CITY_SLUG,
  formatCityLabel,
  listAdminDropdownCities,
  addAdminDropdownCity,
  removeAdminDropdownCity
};
