/* Popote service worker: offline notebook and recipes, photo cache, Web Push.
 * Hand-written on purpose (small, no build step): pages are personal, so the
 * caching rules below are explicit. Bump VERSION to drop every cache on update. */

const VERSION = "v2";
const STATIC_CACHE = `popote-static-${VERSION}`;
const PAGES_CACHE = `popote-pages-${VERSION}`;
const IMAGES_CACHE = `popote-images-${VERSION}`;
const OFFLINE_URL = "/hors-ligne";
const MAX_IMAGES = 80;
const MAX_PAGES = 60;
const NETWORK_TIMEOUT_MS = 6000;

// Pages kept for offline reading: the notebook and recipe sheets the user opened.
const OFFLINE_PAGES = [/^\/carnet$/, /^\/recette\/[0-9a-f-]{36}$/, /^\/copains$/, /^\/une$/, /^\/profil$/, /^\/courses$/];
// Never cached: authentication, APIs, sharing claims, MCP.
const NEVER = [/^\/auth\//, /^\/api\//, /^\/mcp/, /^\/oauth\//, /^\/r\/[^/]+\/ajouter$/, /^\/connexion/];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll([OFFLINE_URL, "/icons/sprite.svg", "/icons/icon-192.png"]))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("popote-") && !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((k) => cache.delete(k)));
}

function timeout(ms) {
  return new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
}

/** Network first; keep a copy of good pages; offline → cached copy → offline page. */
async function page(request) {
  const url = new URL(request.url);
  const keep = OFFLINE_PAGES.some((re) => re.test(url.pathname));
  try {
    const response = await Promise.race([fetch(request), timeout(NETWORK_TIMEOUT_MS)]);
    if (keep && response.ok && !response.redirected && response.type === "basic") {
      const copy = response.clone();
      caches.open(PAGES_CACHE).then((cache) => cache.put(url.pathname, copy).then(() => trim(PAGES_CACHE, MAX_PAGES)));
    }
    return response;
  } catch {
    const cached = keep ? await caches.match(url.pathname, { cacheName: PAGES_CACHE }) : undefined;
    return cached || (await caches.match(OFFLINE_URL)) || Response.error();
  }
}

/** Cache first (immutable build assets, icons, photos). */
async function cacheFirst(request, cacheName, max) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;
  const response = await fetch(request);
  if (response.ok || response.type === "opaque") {
    const copy = response.clone();
    caches.open(cacheName).then((cache) => cache.put(request, copy).then(() => (max ? trim(cacheName, max) : undefined)));
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  if (sameOrigin && NEVER.some((re) => re.test(url.pathname))) return;

  if (request.mode === "navigate" && sameOrigin) {
    event.respondWith(page(request));
    return;
  }
  // React Server Component payloads: network only. When offline, Next falls back
  // to a full navigation, which the page handler above serves from the cache.
  if (sameOrigin && (url.searchParams.has("_rsc") || request.headers.get("RSC") === "1")) return;

  if (sameOrigin && (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/"))) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }
  // Recipe photos (optimised by Next or straight from storage) and avatars.
  if ((sameOrigin && url.pathname.startsWith("/_next/image")) || (request.destination === "image" && url.pathname.includes("/storage/v1/object/public/"))) {
    event.respondWith(cacheFirst(request, IMAGES_CACHE, MAX_IMAGES));
  }
});

// Sign-out: forget the personal pages and photos kept on this device.
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "clear-user-cache") {
    event.waitUntil(Promise.all([caches.delete(PAGES_CACHE), caches.delete(IMAGES_CACHE)]));
  }
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Popote", body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Popote", {
      body: data.body || "",
      icon: "/icons/icon-192.png",
      badge: "/icons/icon-192.png",
      tag: data.tag,
      data: { url: data.url || "/carnet" },
      lang: "fr",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/carnet", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windows) => {
      const open = windows.find((w) => w.url.startsWith(self.location.origin));
      if (open) {
        open.focus();
        return open.navigate(target);
      }
      return self.clients.openWindow(target);
    }),
  );
});
