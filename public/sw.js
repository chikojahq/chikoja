// Offline: the shell is precached at install; a city is cached when the user
// taps "save this city" (message from app.js). Pages are served cache-first
// after a network try (stale-while-revalidate), and when the network is gone
// navigation falls back to the saved city's hub.
const SHELL = "shell-v1", CITY = "city-v1";
const SHELL_FILES = ["/", "/style.css", "/app.js", "/fonts/vazirmatn.woff2", "/logo.svg", "/favicon.svg", "/404.html"];

self.addEventListener("install", e => { e.waitUntil(caches.open(SHELL).then(c => c.addAll(SHELL_FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(self.clients.claim()); });

self.addEventListener("message", async e => {
  if (e.data?.type !== "save-city") return;
  const c = await caches.open(CITY);
  const urls = e.data.urls;
  let done = 0;
  for (const u of urls) { try { await c.add(u); done++; } catch {} }
  const client = await self.clients.get(e.source.id);
  client?.postMessage({ type: "city-saved", slug: e.data.slug, done, total: urls.length });
});

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  e.respondWith((async () => {
    const cached = await caches.match(req, { ignoreSearch: true });
    const fetching = fetch(req).then(res => {
      if (res.ok && cached) caches.open(CITY).then(c => c.put(req, res.clone()));
      return res;
    }).catch(() => null);
    if (cached) { fetching; return cached; }
    const res = await fetching;
    if (res) return res;
    if (req.mode === "navigate") {
      const c = await caches.open(CITY);
      const keys = await c.keys();
      const hub = keys.find(k => /\/[^/]+\/$/.test(decodeURI(new URL(k.url).pathname)) && !/\/[^/]+\/[^/]+\/$/.test(decodeURI(new URL(k.url).pathname)));
      if (hub) return c.match(hub);
      return caches.match("/404.html");
    }
    return Response.error();
  })());
});
