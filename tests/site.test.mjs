import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import worker from "../src/worker.js";
import { startDev } from "./helpers.mjs";

let dev;
before(async () => { dev = await startDev(); });
after(() => dev?.stop());

test("home page is the Persian RTL coming-back page", async () => {
  const res = await fetch(dev.base + "/");
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /<html lang="fa" dir="rtl">/);
  assert.match(html, /چی‌کجا/);
  assert.match(html, /در حال ساخت دوباره/);
  assert.match(html, /حتی بدون اینترنت/);
  assert.match(html, /coming back/);
  assert.doesNotMatch(html, /بایگانی/);
  assert.match(html, /2013–2015/);
  assert.match(html, /lang="en"/);
  assert.match(res.headers.get("content-security-policy") ?? "", /default-src 'none'/);
});

// wrangler dev rewrites every request URL to localhost, so the host check is
// tested against the handler directly with the URLs production will see.
test("www and other subdomains redirect once to the apex", async () => {
  const env = { ASSETS: { fetch: () => new Response("asset") } };
  for (const host of ["www.chikoja.ir", "old.chikoja.ir"]) {
    const res = await worker.fetch(new Request(`https://${host}/some/old/place`), env);
    assert.equal(res.status, 301, host);
    assert.equal(res.headers.get("location"), "https://chikoja.ir/", host);
  }
  const apex = await worker.fetch(new Request("https://chikoja.ir/"), env);
  assert.equal(apex.status, 200);
  assert.equal(await apex.text(), "asset");
});

test("old URLs get a real 404 with a notice", async () => {
  const res = await fetch(dev.base + "/tehran/restaurants/123");
  assert.equal(res.status, 404);
  assert.match(await res.text(), /این صفحه دیگر وجود ندارد/);
});

test("only GET and HEAD are accepted", async () => {
  const res = await fetch(dev.base + "/", { method: "POST", body: "x" });
  assert.equal(res.status, 405);
});

test("no external resources, scripts or forms (no tracking)", async () => {
  const files = (await readdir("public")).filter((f) => /\.(html|css)$/.test(f));
  assert.ok(files.length >= 3, `expected html/css files, got ${files}`);
  for (const f of files) {
    const src = await readFile(`public/${f}`, "utf8");
    assert.doesNotMatch(src, /<script|<form|<iframe/i, f);
    assert.doesNotMatch(src, /(src|href)=["']https?:/i, f);
    assert.doesNotMatch(src, /url\(["']?https?:/i, f);
  }
});
