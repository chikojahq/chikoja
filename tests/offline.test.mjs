// The pack opens with no network from a file:// URL; a saved city is served offline by the PWA.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { stat } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";
import { startDev } from "./helpers.mjs";

let browser, dev;
before(async () => { browser = await chromium.launch(); dev = await startDev(); });
after(async () => { await browser?.close(); dev?.stop(); });

test("packs exist for every city and stay within the size budget", async () => {
  const { cities } = JSON.parse(await (await import("node:fs/promises")).readFile("data/build/cities.json", "utf8"));
  assert.ok(cities.length > 1000);
  let checked = 0;
  for (const c of cities) {
    const { size } = await stat(`dist/packs/${c.en}.html`);
    // Tehran has ~2,200 places; every other city stays under 150 KB.
    assert.ok(size <= (c.en === "tehran" ? 500_000 : 150_000), `${c.en} pack is ${size} bytes`);
    checked++;
  }
  assert.equal(checked, cities.length);
});

test("the Tehran pack works offline from a file URL", async () => {
  const ctx = await browser.newContext({ offline: true });
  const page = await ctx.newPage();
  const bad = [];
  page.on("requestfailed", r => bad.push(r.url()));
  await page.goto(pathToFileURL(`${process.cwd()}/dist/packs/tehran.html`).href);
  assert.match(await page.title(), /تهران/);
  assert.ok((await page.locator("li.p").count()) > 1000);
  assert.match(await page.textContent("footer"), /OpenStreetMap/);
  assert.match(await page.textContent("body"), /tel:|۱۱۵/);
  assert.deepEqual(bad, [], "no network requests");
  await ctx.close();
});

test("a saved city is served offline by the service worker", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(dev.base + encodeURI("/آباده/"));
  await page.waitForSelector("[data-save]:not([hidden])");
  await page.click("[data-save]");
  await page.waitForFunction(() => /ذخیره شد/.test(document.querySelector("[data-save]").textContent), null, { timeout: 30000 });
  await ctx.setOffline(true);
  await page.goto(dev.base + encodeURI("/آباده/داروخانه/"));
  assert.match(await page.textContent("h1"), /داروخانه/);
  await page.goto(dev.base + encodeURI("/شیراز/"));
  assert.match(await page.textContent("h1"), /آباده/, "unknown page offline falls back to the saved city");
  await ctx.close();
});

test("a new service worker drops old caches and serves fresh CSS", async () => {
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(dev.base + encodeURI("/آباده/"));
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null || true);
  // A stale cache left by an earlier worker version, then a fresh install (as a new sw.js causes).
  await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; const c = await caches.open("shell-v1"); await c.put("/style.css", new Response("body{}", { headers: { "content-type": "text/css" } })); await r.unregister(); });
  await page.reload();
  // waitForFunction treats a returned promise as truthy, so poll inside the page instead.
  const keys = await page.evaluate(async () => { for (let i = 0; i < 60; i++) { const k = await caches.keys(); if (k.length && k.every(x => x.endsWith("-v3"))) return k; await new Promise(r => setTimeout(r, 250)); } return caches.keys(); });
  assert.ok(keys.every(k => k.endsWith("-v3")), `old caches gone: ${keys}`);
  const css = await page.evaluate(() => fetch("/style.css").then(r => r.text()));
  assert.match(css, /\.theme\{/, "fresh stylesheet, not the stale one");
  await ctx.close();
});
