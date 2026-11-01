import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir, stat } from "node:fs/promises";
import worker from "../src/worker.js";
import { startDev } from "./helpers.mjs";

let dev;
before(async () => { dev = await startDev(); });
after(() => dev?.stop());
const get = (p) => fetch(dev.base + encodeURI(p), { redirect: "manual" });

test("home is the Persian RTL city list with the emergency numbers", async () => {
  const res = await get("/");
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<html lang="fa" dir="rtl">/);
  assert.match(html, /چی‌کجا/);
  assert.match(html, /tel:115/);
  assert.match(html, new RegExp(`href="${encodeURI("/تهران/")}"`));
  assert.match(html, /OpenStreetMap/);
  assert.match(res.headers.get("content-security-policy") ?? "", /default-src 'none'/);
});

test("city hub, category page, pack page and empty category render", async () => {
  for (const p of ["/مشهد/", "/مشهد/داروخانه/", "/مشهد/بسته/", "/مشهد/پناهگاه/", "/packs/mashhad"]) assert.equal((await get(p)).status, 200, p);
  assert.match((await get("/مشهد/")).headers.get("content-type") ?? "", /text\/html/);
  assert.match(await (await get("/مشهد/")).text(), /href="\/packs\/mashhad" download="chikoja-mashhad.html"/);
  const html = await (await get("/مشهد/داروخانه/")).text();
  assert.match(html, /class="place"/);
  assert.match(html, /geo:\d/);
  assert.match(html, /اشتباه است؟/);
  assert.match(html, /[۰-۹]+ مکان/, "Persian digits");
});

test("english aliases redirect to the Persian URL", async () => {
  const res = await get("/en/mashhad/");
  assert.equal(res.status, 301);
  assert.equal(decodeURI(new URL(res.headers.get("location")).pathname), "/مشهد/");
  const cat = await get("/en/mashhad/pharmacies/");
  assert.equal(cat.status, 301);
  assert.equal(decodeURI(new URL(cat.headers.get("location")).pathname), "/مشهد/داروخانه/");
  assert.equal((await get("/en/nowhere/")).status, 404);
});

// wrangler dev rewrites every request URL to localhost, so the host check is
// tested against the handler directly with the URLs production will see.
test("www and other subdomains redirect once to the apex", async () => {
  const env = { ASSETS: { fetch: () => new Response("asset") } };
  const res = await worker.fetch(new Request("https://www.chikoja.ir/مشهد/"), env);
  assert.equal(res.status, 301);
  assert.equal(decodeURI(res.headers.get("location")), "https://chikoja.ir/مشهد/");
});

test("unknown paths get a 404 page; only GET and HEAD are accepted", async () => {
  const res = await get("/tehran/restaurants/123");
  assert.equal(res.status, 404);
  assert.match(await res.text(), /پیدا نشد/);
  assert.equal((await fetch(dev.base + "/", { method: "POST", body: "x" })).status, 405);
});

test("no external resources or forms in any built file; file count under the limit", async () => {
  const files = ["index.html", "404.html", "style.css", "app.js", "تهران/داروخانه/index.html", "درباره/index.html"];
  for (const f of files) {
    const src = await readFile(`dist/${f}`, "utf8");
    assert.doesNotMatch(src, /<form|<iframe/i, f);
    assert.doesNotMatch(src, /(src|href)=["']https?:[^"']*\.(js|css|woff2?|png|svg)/i, f);
    assert.doesNotMatch(src, /url\(["']?https?:/i, f);
    assert.doesNotMatch(src, /<script src="https?:/i, f);
  }
  const n = +(await import("node:child_process")).execSync("find dist -type f | wc -l").toString();
  assert.ok(n > 1000 && n < 20000, `dist has ${n} files`);
});
