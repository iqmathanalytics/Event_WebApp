import api from "./api";
import { buildCacheKey, cachedClientFetch, clearClientCacheByPrefix } from "../utils/clientCache";

const CITIES_CACHE_TTL_MS = 5 * 60 * 1000;
const CITIES_CACHE_PREFIX = "meta:cities";

/** Admin-managed dropdown cities only (`show_in_dropdown` in DB) — not a full US city list. */
export async function fetchCities(params = {}) {
  const cacheKey = buildCacheKey(CITIES_CACHE_PREFIX, params);
  return cachedClientFetch(
    cacheKey,
    async () => {
      const response = await api.get("/meta/cities", { params });
      return response.data;
    },
    { ttlMs: CITIES_CACHE_TTL_MS, persistent: true }
  );
}

export function clearCitiesCache() {
  clearClientCacheByPrefix(CITIES_CACHE_PREFIX, { persistent: true });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("bmt:cities-cache-cleared"));
  }
}
