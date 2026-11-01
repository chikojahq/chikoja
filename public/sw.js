// Offline: the shell is precached at install; a city is cached when the user
// taps "save this city" (message from app.js). Pages, CSS and JS are fetched
// from the network first and fall back to the cache, so an update is never
// hidden behind a stale copy; fonts and icons are cache-first. Old caches are
// deleted on activate (a stale style.css once lingered in a previous cache).
const VERSION = "v3";
const SHELL = `shell-${VERSION}`, CITY = `city-${VERSION}`;
const SHELL_FILES = ["/", "/style.css", "/app.js", "/theme.js", "/fonts/vazirmatn.woff2", "/logo.svg", "/favicon.svg", "/404.html"];

self.addEventListener("install", e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== SHELL && k !== CITY) await caches.delete(k);
    await self.clients.claim();
  })());
});

self.addEventListener("message", async e => {
  if (e.data?.type !== "save-city") return;
  const c = await caches.open(CITY);
  const urls = e.data.urls;
  let done = 0;
  for (const u of urls) { try { await c.add(u); done++; } catch {} }
  const client = await self.clients.get(e.source.id);
  client?.postMessage({ type: "city-saved", slug: e.data.slug, done, total: urls.length });
});

const immutable = url => /\.(woff2|svg|png)$/.test(url.pathname);

self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    if (cached && immutable(url)) return cached;
    try {
      const res = await fetch(req);
      if (res.ok && cached) { const c = await caches.open(CITY); c.put(req, res.clone()); }
      return res;
    } catch {
      if (cached) return cached;
      if (req.mode === "navigate") {
        const c = await caches.open(CITY);
        const keys = await c.keys();
        const hub = keys.find(k => /\/[^/]+\/$/.test(decodeURI(new URL(k.url).pathname)) && !/\/[^/]+\/[^/]+\/$/.test(decodeURI(new URL(k.url).pathname)));
        if (hub) return c.match(hub);
        return caches.match("/404.html");
      }
      return Response.error();
    }
  })());
});
