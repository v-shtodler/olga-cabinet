/* Service worker: offline viewing of the last-seen screens.
   - static assets (/_next/static, icons, fonts): cache-first
   - pages (HTML) and Next's RSC payloads: network-first with a short timeout, fallback to the cached copy, then /offline
   - everything else (POST, API, auth): straight to the network, never cached */
const V = "v2";
const STATIC = `static-${V}`, PAGES = `pages-${V}`, RSC = `rsc-${V}`;
const OFFLINE_URL = "/offline";
const NET_TIMEOUT = 6000;

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(PAGES).then((c) => c.add(OFFLINE_URL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => ![STATIC, PAGES, RSC].includes(k)).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => { if (e.data === "clear") caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))); });

function pageKey(url) { const u = new URL(url); u.searchParams.delete("_rsc"); return u.toString(); }
function withTimeout(p, ms) { return new Promise((res, rej) => { const t = setTimeout(() => rej(new Error("timeout")), ms); p.then((v) => { clearTimeout(t); res(v); }, (err) => { clearTimeout(t); rej(err); }); }); }

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/auth/")) return;

  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || /\.(?:png|svg|ico|woff2?|webmanifest)$/.test(url.pathname)) {
    e.respondWith(caches.open(STATIC).then(async (c) => (await c.match(req)) || fetch(req).then((r) => { if (r.ok) c.put(req, r.clone()); return r; })));
    return;
  }

  const isRsc = req.headers.get("RSC") === "1";
  const isNav = req.mode === "navigate" || req.destination === "document" || req.headers.get("x-warm") === "1";
  if (!isRsc && !isNav) return;

  const cacheName = isRsc ? RSC : PAGES;
  const key = pageKey(req.url);
  e.respondWith((async () => {
    const c = await caches.open(cacheName);
    try {
      const r = await withTimeout(fetch(req), NET_TIMEOUT);
      if (r.ok && r.status === 200 && !url.pathname.startsWith("/login")) c.put(key, r.clone());
      return r;
    } catch {
      const hit = await c.match(key);
      if (hit) return hit;
      if (isNav) return (await caches.match(OFFLINE_URL)) || new Response("Офлайн", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
      return new Response("", { status: 503 });
    }
  })());
});
