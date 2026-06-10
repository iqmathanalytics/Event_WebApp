import api from "./api";
import { buildCacheKey, cachedClientFetch } from "../utils/clientCache";

const CITIES_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Admin-managed dropdown cities only (`show_in_dropdown` in DB) — not a full US city list. */
export async function fetchCities(params = {}) {
  const cacheKey = buildCacheKey("meta:cities", params);
  return cachedClientFetch(
    cacheKey,
    async () => {
      const response = await api.get("/meta/cities", { params });
      return response.data;
    },
    { ttlMs: CITIES_CACHE_TTL_MS, persistent: true }
  );
}
