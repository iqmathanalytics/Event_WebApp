const memoryCache = new Map();

function storageFor(persistent) {
  return persistent ? localStorage : sessionStorage;
}

export function readClientCache(key, { persistent = false } = {}) {
  const mem = memoryCache.get(key);
  if (mem && mem.expiresAt > Date.now()) {
    return mem.data;
  }
  if (mem) {
    memoryCache.delete(key);
  }

  try {
    const raw = storageFor(persistent).getItem(key);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Date.now() > Number(parsed.expiresAt)) {
      storageFor(persistent).removeItem(key);
      return null;
    }
    memoryCache.set(key, { data: parsed.data, expiresAt: Number(parsed.expiresAt) });
    return parsed.data;
  } catch {
    return null;
  }
}

export function writeClientCache(key, data, ttlMs, { persistent = false } = {}) {
  const expiresAt = Date.now() + Math.max(1000, Number(ttlMs) || 60_000);
  memoryCache.set(key, { data, expiresAt });
  try {
    storageFor(persistent).setItem(key, JSON.stringify({ data, expiresAt }));
  } catch {
    // Quota exceeded — memory cache still helps for this session.
  }
}

export function clearClientCacheByPrefix(prefix, { persistent = false } = {}) {
  [...memoryCache.keys()].forEach((key) => {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  });
  try {
    const storage = storageFor(persistent);
    for (let i = storage.length - 1; i >= 0; i -= 1) {
      const key = storage.key(i);
      if (key?.startsWith(prefix)) {
        storage.removeItem(key);
      }
    }
  } catch {
    // Ignore storage access issues.
  }
}

export function buildCacheKey(prefix, params = {}) {
  const parts = Object.keys(params)
    .sort()
    .map((key) => `${key}=${String(params[key] ?? "")}`);
  return `${prefix}:${parts.join("&")}`;
}

export function isAuthenticatedClient() {
  try {
    return Boolean(localStorage.getItem("accessToken"));
  } catch {
    return false;
  }
}

export async function cachedClientFetch(key, fetcher, { ttlMs = 180_000, persistent = false } = {}) {
  const cached = readClientCache(key, { persistent });
  if (cached !== null) {
    return cached;
  }
  const data = await fetcher();
  writeClientCache(key, data, ttlMs, { persistent });
  return data;
}
