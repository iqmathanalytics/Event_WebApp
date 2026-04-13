const IMAGE_CACHE = "yayeventz-images-v1";
const APP_CACHE = "yayeventz-app-v1";
const IMAGE_CACHE_MAX_ENTRIES = 120;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_CACHE));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== IMAGE_CACHE && key !== APP_CACHE)
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isImageRequest(request) {
  if (request.destination === "image") {
    return true;
  }
  try {
    const url = new URL(request.url);
    return /\.(png|jpe?g|webp|gif|avif|svg)(\?.*)?$/i.test(url.pathname);
  } catch (_err) {
    return false;
  }
}

async function trimImageCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= IMAGE_CACHE_MAX_ENTRIES) {
    return;
  }
  const overflow = keys.length - IMAGE_CACHE_MAX_ENTRIES;
  await Promise.all(keys.slice(0, overflow).map((key) => cache.delete(key)));
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET" || !isImageRequest(request)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(IMAGE_CACHE);
      const cached = await cache.match(request, { ignoreVary: true });
      if (cached) {
        return cached;
      }

      try {
        const response = await fetch(request);
        if (response && (response.ok || response.type === "opaque")) {
          cache.put(request, response.clone()).then(() => trimImageCache(cache));
        }
        return response;
      } catch (err) {
        if (cached) {
          return cached;
        }
        throw err;
      }
    })()
  );
});
