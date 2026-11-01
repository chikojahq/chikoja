// Visual check: the main page types at desktop and phone width, light and dark,
// from a local wrangler dev server. Fails on horizontal overflow, a missing font
// or a tap target under 44px.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { startDev } from "./helpers.mjs";

const PAGES = { home: "/", "tehran-hub": "/تهران/", "town-hub": "/آباده/", "tehran-pharmacies": "/تهران/داروخانه/", "empty": "/آباده/هلال-احمر/", "shelter": "/مشهد/پناهگاه/", guide: "/راهنما/ویرایش/", "pack-page": "/مشهد/بسته/", "404": "/no/such/page" };
const dev = await startDev();
const browser = await chromium.launch();
let failures = 0, shots = 0;
try {
  await mkdir("screenshots", { recursive: true });
  for (const [name, path] of Object.entries(PAGES)) for (const [size, width, height] of [["desktop", 1280, 800], ["phone", 390, 844]]) for (const scheme of ["light", "dark"]) {
    const page = await browser.newPage({ viewport: { width, height }, colorScheme: scheme });
    await page.goto(dev.base + encodeURI(path));
    await page.evaluate(() => document.fonts.ready);
    const font = await page.evaluate(() => document.fonts.check('16px "Vazirmatn"'));
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    const small = await page.evaluate(() => [...document.querySelectorAll("a,button")].filter(a => !a.closest("p,li:not(.place)") && !a.closest("details:not([open])") && a.getBoundingClientRect().width && a.getBoundingClientRect().height < 44).map(a => a.textContent.trim().slice(0, 20)));
    const file = `screenshots/${name}-${size}-${scheme}.png`;
    await page.screenshot({ path: file, fullPage: !name.includes("pharmacies") && name !== "home" });
    shots++;
    if (overflow || !font || small.length) { failures++; console.error(`FAIL ${file}: overflow=${overflow} font=${font} small=${JSON.stringify(small)}`); }
    await page.close();
  }
} finally { await browser.close(); dev.stop(); }
const expected = Object.keys(PAGES).length * 4;
if (shots !== expected) { console.error(`expected ${expected} screenshots, took ${shots}`); process.exit(2); }
console.log(`${shots} screenshots, ${failures} failures`);
process.exit(failures ? 1 : 0);
