// Screenshots of the page at desktop and phone width, light and dark, from a
// local wrangler dev server. Also fails on horizontal overflow at each size.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import { startDev } from "./helpers.mjs";

const dev = await startDev();
const browser = await chromium.launch();
let failures = 0, shots = 0;
try {
  await mkdir("screenshots", { recursive: true });
  for (const path of ["/", "/no/such/page"]) {
    for (const [name, width, height] of [["desktop", 1280, 800], ["phone", 390, 844]]) {
      for (const scheme of ["light", "dark"]) {
        const page = await browser.newPage({ viewport: { width, height }, colorScheme: scheme });
        await page.goto(dev.base + path);
        await page.evaluate(() => document.fonts.ready);
        const font = await page.evaluate(() => document.fonts.check('16px "Vazirmatn"'));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
        const file = `screenshots/${path === "/" ? "home" : "404"}-${name}-${scheme}.png`;
        await page.screenshot({ path: file, fullPage: true });
        shots++;
        if (overflow || !font) { failures++; console.error(`FAIL ${file}: overflow=${overflow} fontLoaded=${font}`); }
        else console.log(`ok ${file}`);
        await page.close();
      }
    }
  }
} finally {
  await browser.close();
  dev.stop();
}
if (shots !== 8) { console.error(`expected 8 screenshots, took ${shots}`); process.exit(2); }
process.exit(failures ? 1 : 0);
