const CACHE_VERSION = "v2";
const STATIC_CACHE = `cfms-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `cfms-runtime-${CACHE_VERSION}`;
const PRECACHE_URLS = ["/login", "/offline"];

// Max age for runtime cache entries (24 hours)
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip: API routes, auth, external origins
  if (url.pathname.startsWith("/api/")) return;
  if (url.origin !== self.location.origin) return;

  // Static assets (_next/static): cache-first (immutable hashes)
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((response) => {
            if (response.ok) {
              const clone = response.clone();
              caches.open(STATIC_CACHE).then((cache) => cache.put(request, clone));
            }
            return response;
          })
      )
    );
    return;
  }

  // Navigation & dynamic pages: network-first with short timeout
  if (request.mode === "navigate" || url.pathname.startsWith("/_next/data/")) {
    event.respondWith(
      fetchWithTimeout(request, 4000)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match("/offline"))
        )
    );
    return;
  }

  // Other assets (images, fonts, CSS, JS): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response.ok && url.origin === self.location.origin) {
            const clone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => cached);

      return cached || fetchPromise;
    })
  );
});

// Fetches with a timeout to prevent long waits on slow networks
function fetchWithTimeout(request, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
    fetch(request).then(
      (response) => {
        clearTimeout(timer);
        resolve(response);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

// Periodically clean old runtime cache entries
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data === "CLEAN_CACHE") {
    caches.open(RUNTIME_CACHE).then((cache) =>
      cache.keys().then((keys) => {
        for (const req of keys) {
          cache.match(req).then((res) => {
            if (res) {
              const dateHeader = res.headers.get("date");
              if (dateHeader && Date.now() - new Date(dateHeader).getTime() > MAX_CACHE_AGE) {
                cache.delete(req);
              }
            }
          });
        }
      })
    );
  }
});
