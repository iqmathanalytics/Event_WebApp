const STATIC_CACHE = "bookmytickets-static-v3";

/** Same-origin branding only — avoids double-fetching API/CDN assets. */
function isBrandStaticImage(request) {
  if (request.method !== "GET") {
    return false;
  }
  try {
    const url = new URL(request.url);
    if (url.origin !== self.location.origin) {
      return false;
    }
    return url.pathname.startsWith("/branding/") && /\.(png|jpe?g|webp|gif|avif|svg)$/i.test(url.pathname);
  } catch (_err) {
    return false;
  }
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== STATIC_CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!isBrandStaticImage(request)) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);
      const cached = await cache.match(request);
      if (cached) {
        return cached;
      }

      const response = await fetch(request);
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })()
  );
});
