const CACHE = "binksy-logokit-v4";
const CACHE_PREFIX = "binksy-logokit-";
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(["__PRECACHE__"]))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  if (
    event.request.method !== "GET" ||
    new URL(event.request.url).origin !== self.location.origin
  )
    return;
  const isDocument =
    event.request.mode === "navigate" || event.request.destination === "document";
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      if (isDocument) {
        try {
          const response = await fetch(event.request);
          if (response.ok) await cache.put(event.request, response.clone());
          return response;
        } catch {
          return cache.match(event.request, { ignoreVary: true });
        }
      }

      const cached = await cache.match(event.request, { ignoreVary: true });
      if (cached) return cached;

      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone());
      return response;
    }),
  );
});
