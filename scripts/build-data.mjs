// data/build/extract.json → data/build/cities.json + data/build/city/<en>.json
// Cities are place=city|town with a name; each place goes to the city whose
// admin boundary contains it, else the nearest city within 15 km / town within 7 km.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from "node:fs";
import { categories, categorize, slugify, asciiSlug, fold, pointInRings, distanceKm, placeRecord } from "../src/data.mjs";
const [inFile = "data/build/extract.json"] = process.argv.slice(2);
const els = JSON.parse(readFileSync(inFile));

const provinces = els.filter(e => e.rings && e.tags.admin_level === "4");
const cityBounds = els.filter(e => e.rings && e.tags.admin_level === "8");
const provinceOf = (lat, lon) => provinces.find(p => pointInRings(lat, lon, p.rings))?.tags;

const cities = [];
const seen = new Map();
// Only place *nodes* are cities: boundary relations also carry place=city and would duplicate them.
const placeNodes = els.filter(e => e.type === "n" && (e.tags.place === "city" || e.tags.place === "town"));
// A city's boundary: the admin_level 8 ring that contains its node and carries its name («شهر مشهد» for مشهد).
const boundaryOf = (e, name) => cityBounds.find(b => pointInRings(e.lat, e.lon, b.rings) && fold(b.tags["name:fa"] || b.tags.name).includes(name));
const cityRings = placeNodes.filter(e => e.tags.place === "city").map(e => boundaryOf(e, fold(e.tags["name:fa"] || e.tags.name))?.rings).filter(Boolean);
const seenEn = new Set();
let merged = 0;
for (const e of placeNodes) {
  const name = fold(e.tags["name:fa"] || e.tags.name);
  // A town inside a city's boundary (Tajrish in Tehran) is part of that city, not a city of its own.
  if (e.tags.place === "town" && cityRings.some(r => pointInRings(e.lat, e.lon, r))) { merged++; continue; }
  const prov = provinceOf(e.lat, e.lon);
  const slug = slugify(name);
  // Same-named towns (there are several «حسن‌آباد») get a province suffix, then a number.
  let key = slug, en = asciiSlug(e.tags["name:en"] || name, e.id);
  if (seen.has(key)) { key = prov ? `${slug}-${slugify(prov["name:fa"] || prov.name)}` : key; en = `${en}-${prov ? asciiSlug(prov["name:en"] || prov.name, e.id) : e.id}`; }
  let n = 2; const base = key, baseEn = en; while (seen.has(key) || seenEn.has(en)) { key = `${base}-${n}`; en = `${baseEn}-${n}`; n++; }
  seen.set(key, true); seenEn.add(en);
  const bounds = boundaryOf(e, name);
  cities.push({ slug: key, en, name, nameEn: e.tags["name:en"] || null, kind: e.tags.place, lat: e.lat, lon: e.lon, population: +e.tags.population || null,
    province: prov ? fold(prov["name:fa"] || prov.name) : null, provinceEn: prov?.["name:en"] || null, rings: bounds?.rings || null, places: [] });
}
console.error(`${cities.length} cities/towns (${merged} towns merged into cities), ${provinces.length} provinces, ${cities.filter(c => c.rings).length} with boundaries`);

let assigned = 0, unassigned = 0, dup = 0;
const byId = new Set();
for (const e of els) {
  const cat = categorize(e.tags, e);
  if (!cat) continue;
  const id = e.type + e.id; if (byId.has(id)) { dup++; continue; } byId.add(id);
  let city = cities.find(c => c.rings && pointInRings(e.lat, e.lon, c.rings));
  if (!city) {
    let best = null, bestD = Infinity;
    for (const c of cities) { const d = distanceKm(e.lat, e.lon, c.lat, c.lon); if (d < bestD && d <= (c.kind === "city" ? 15 : 7)) { best = c; bestD = d; } }
    city = best;
  }
  if (!city) { unassigned++; continue; }
  city.places.push(placeRecord(e, cat));
  assigned++;
}
console.error(`${assigned} places assigned, ${unassigned} unassigned, ${dup} duplicates`);

const outDir = new URL("../data/build/city/", import.meta.url);
rmSync(outDir, { recursive: true, force: true }); mkdirSync(outDir, { recursive: true });
const index = [];
for (const c of cities) {
  const counts = {};
  for (const p of c.places) counts[p.cat] = (counts[p.cat] || 0) + 1;
  // Badged first; places with only a generic name and no address («داروخانه», nothing else) last.
  const generic = p => (p.name === categories.find(k => k.en === p.cat)?.title || p.name === p.cat) && !p.street && !p.suburb ? 1 : 0;
  c.places.sort((a, b) => (b.first - a.first) || (generic(a) - generic(b)) || a.name.localeCompare(b.name, "fa"));
  const { rings, ...rest } = c;
  writeFileSync(new URL(`${c.en}.json`, outDir), JSON.stringify(rest));
  index.push({ slug: c.slug, en: c.en, name: c.name, nameEn: c.nameEn, kind: c.kind, province: c.province, population: c.population, counts, total: c.places.length });
}
index.sort((a, b) => (b.total - a.total));
writeFileSync(new URL("../data/build/cities.json", import.meta.url), JSON.stringify({ built: new Date().toISOString().slice(0, 10), cities: index }));
console.error("wrote cities.json");
