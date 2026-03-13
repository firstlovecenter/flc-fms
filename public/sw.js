const CACHE_VERSION = "v3";
const STATIC_CACHE  = `cfms-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `cfms-runtime-${CACHE_VERSION}`;
const DATA_CACHE    = `cfms-data-${CACHE_VERSION}`;

// ── Routes pre-cached on install ─────────────────────────────────────────────
// Public routes that should work even before the user visits them.
const PRECACHE_URLS = [
  // Core
  "/offline",
  "/pwa",
  "/unauthorized",
  // Auth shells
  "/login",
  "/forgot-password",
  "/change-password",
  "/patron/login",
  "/patron/register",
  // Public catalog
  "/",
  "/guest/book",
  "/pay",
  // Offline data endpoint — seeds the catalog data cache
  "/api/offline/catalog",
];

// ── Routes where stale HTML is acceptable (pre-cache if visited) ─────────────
// Dynamic staff/patron pages are cached at runtime (network-first).
// We list common entry-points here so the SW warms them up on activation.
const WARM_URLS = [
  "/dashboard",
  "/bookings",
  "/transactions",
  "/facilities",
  "/staff",
  "/events",
  "/maintenance",
  "/reports",
  "/inventory",
  "/items",
  "/patron/dashboard",
  "/patron/bookings",
  "/patron/profile",
  "/patron/receipts",
];

// Max age for runtime cache entries (24 hours)
const MAX_CACHE_AGE = 24 * 60 * 60 * 1000;
// Max age for data (API) cache entries (1 hour)
const DATA_CACHE_AGE = 60 * 60 * 1000;

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) =>
        // Use individual addAll calls so a single fail doesn't abort the whole install.
        Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url)))
      )
      .then(() => self.skipWaiting())
  );
});

// ── Activate ──────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  const keep = new Set([STATIC_CACHE, RUNTIME_CACHE, DATA_CACHE]);
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !keep.has(k)).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
      .then(() => warmRuntimeCache())
  );
});

// Fetch warm-up pages in background after activation so they're cached for offline.
function warmRuntimeCache() {
  return caches.open(RUNTIME_CACHE).then((cache) =>
    Promise.allSettled(
      WARM_URLS.map((url) =>
        fetch(url, { credentials: "include" })
          .then((res) => { if (res.ok) cache.put(url, res); })
          .catch(() => {})
      )
    )
  );
}

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Skip external origins
  if (url.origin !== self.location.origin) return;

  // ── Offline data API: stale-while-revalidate with DATA_CACHE ─────────────
  if (url.pathname.startsWith("/api/offline/")) {
    event.respondWith(
      caches.open(DATA_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          });
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Skip all other /api/ routes (auth callbacks, uploads, webhooks)
  if (url.pathname.startsWith("/api/")) return;

  // ── Static assets (_next/static): cache-first (immutable content hashes) ──
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

  // ── Images & media: stale-while-revalidate ────────────────────────────────
  const isMedia =
    /\.(png|jpe?g|webp|gif|svg|ico|woff2?|ttf|mp4|webm)$/i.test(url.pathname) ||
    url.pathname.startsWith("/uploads/") ||
    url.pathname.startsWith("/icons/");

  if (isMedia) {
    event.respondWith(
      caches.open(RUNTIME_CACHE).then((cache) =>
        cache.match(request).then((cached) => {
          const fetchPromise = fetch(request).then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // ── Navigation & Next data: network-first → cached → /offline ────────────
  if (request.mode === "navigate" || url.pathname.startsWith("/_next/data/")) {
    event.respondWith(
      fetchWithTimeout(request, 5000)
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

  // ── Everything else: stale-while-revalidate ───────────────────────────────
  event.respondWith(
    caches.open(RUNTIME_CACHE).then((cache) =>
      cache.match(request).then((cached) => {
        const fetchPromise = fetch(request)
          .then((response) => {
            if (response.ok) cache.put(request, response.clone());
            return response;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    )
  );
});

// ── Background Sync ───────────────────────────────────────────────────────────
// The client enqueues CFMS_OFFLINE_QUEUE sync tags when saving drafts offline.
self.addEventListener("sync", (event) => {
  if (event.tag === "cfms-offline-queue") {
    // Notify all clients so they can flush the IndexedDB queue via server actions.
    event.waitUntil(
      self.clients.matchAll({ type: "window" }).then((clients) => {
        for (const client of clients) {
          client.postMessage({ type: "FLUSH_OFFLINE_QUEUE" });
        }
      })
    );
  }
});

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Message handling ──────────────────────────────────────────────────────────
// Periodically clean old runtime cache entries
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data === "CLEAN_CACHE") {
    cleanExpiredEntries(RUNTIME_CACHE, MAX_CACHE_AGE);
    cleanExpiredEntries(DATA_CACHE, DATA_CACHE_AGE);
  }
});

function cleanExpiredEntries(cacheName, maxAge) {
  caches.open(cacheName).then((cache) =>
    cache.keys().then((keys) => {
      for (const req of keys) {
        cache.match(req).then((res) => {
          if (res) {
            const dateHeader = res.headers.get("date");
            if (dateHeader && Date.now() - new Date(dateHeader).getTime() > maxAge) {
              cache.delete(req);
            }
          }
        });
      }
    })
  );
}
