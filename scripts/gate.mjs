// Sanity gate for a fresh build: refuse (exit 1) when the total number of
// places drops more than 30% from the last good build, or any of the five big
// cities loses more than 30% in a category. `--update` records the new counts.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
const BIG = ["tehran", "mashhad", "tabriz", "isfahan", "shiraz"];
const file = process.env.LAST_GOOD || "data/last-good-counts.json";
const { cities } = JSON.parse(readFileSync("data/build/cities.json"));
const now = { total: cities.reduce((s, c) => s + c.total, 0), big: Object.fromEntries(BIG.map(en => [en, cities.find(c => c.en === en)?.counts || {}])) };
for (const en of BIG) for (const k of ["hospitals", "pharmacies", "fuel"]) if (!(now.big[en][k] > 0)) { console.error(`gate: ${en} has no ${k}`); process.exit(1); }
if (process.argv.includes("--update")) { writeFileSync(file, JSON.stringify(now, null, 1) + "\n"); console.error(`gate: recorded ${now.total} places in ${file}`); process.exit(0); }
if (!existsSync(file)) { console.error(`gate: no ${file}; run with --update after checking the build by hand`); process.exit(2); }
const last = JSON.parse(readFileSync(file));
let bad = 0, checks = 0;
const check = (label, prev, cur) => { checks++; if (prev > 0 && cur < prev * 0.7) { bad++; console.error(`gate: ${label} dropped ${prev} → ${cur}`); } };
check("total places", last.total, now.total);
for (const en of BIG) for (const k of Object.keys(last.big[en] || {})) check(`${en}/${k}`, last.big[en][k], now.big[en][k] || 0);
if (checks < 2) { console.error("gate: nothing to check"); process.exit(2); }
console.error(`gate: ${checks} checks, ${bad} failures; ${now.total} places (last good ${last.total})`);
process.exit(bad ? 1 : 0);
