// Pull the few things chikoja needs out of the Geofabrik Iran extract, in pure Node:
// places matching data/categories.json, place=city|town nodes, and admin boundaries
// (province = 4, city = 8). osmium is not available on the build machines (no sudo),
// so this streams the PBF three times: tagged items, then the ways they need, then
// the nodes those ways need. Output: data/build/extract.json.
import { createReadStream, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const parseOSM = require("osm-pbf-parser");
const [pbf, outFile = "data/build/extract.json"] = process.argv.slice(2);
if (!pbf) { console.error("usage: extract.mjs <iran.osm.pbf> [out.json]"); process.exit(2); }
const categories = JSON.parse(readFileSync(new URL("../data/categories.json", import.meta.url)));

function matches(tags) {
  for (const c of categories) {
    for (const [k, v] of c.match) {
      if (tags[k] === v) {
        const req = c.require?.[k];
        if (req && !Object.entries(req).every(([rk, rv]) => tags[rk] === rv)) continue;
        return true;
      }
    }
    if (c.nameMatch && new RegExp(c.nameMatch).test([tags.name, tags["name:fa"], tags.operator, tags.brand].join(" "))) return true;
  }
  return false;
}
const isPlace = t => (t.place === "city" || t.place === "town") && (t.name || t["name:fa"]);
const isBoundary = t => t.boundary === "administrative" && (t.admin_level === "4" || t.admin_level === "8") && t.name;

function scan(onItem) {
  return new Promise((resolve, reject) => {
    const osm = parseOSM();
    createReadStream(pbf).pipe(osm).on("data", items => { for (const it of items) onItem(it); }).on("end", resolve).on("error", reject);
  });
}

const kept = [];              // tagged items we care about
const wantWays = new Set();   // way ids whose geometry we need
const wantNodes = new Set();  // node ids whose coords we need
const ways = new Map();       // id -> refs
const nodes = new Map();      // id -> [lat, lon]

await scan(it => {
  const t = it.tags || {};
  if (!Object.keys(t).length) return;
  const keep = matches(t) || (it.type === "node" && isPlace(t)) || (it.type === "relation" && isBoundary(t)) || (it.type !== "node" && isPlace(t));
  if (!keep) return;
  kept.push(it);
  if (it.type === "way") wantWays.add(it.id);
  if (it.type === "relation") for (const m of it.members) if (m.type === "way" && (m.role === "outer" || m.role === "")) wantWays.add(m.id);
});
console.error(`pass 1: ${kept.length} items, ${wantWays.size} ways needed`);
await scan(it => { if (it.type === "way" && wantWays.has(it.id)) { ways.set(it.id, it.refs); for (const r of it.refs) wantNodes.add(r); } });
console.error(`pass 2: ${ways.size} ways, ${wantNodes.size} nodes needed`);
await scan(it => { if (it.type === "node" && wantNodes.has(it.id)) nodes.set(it.id, [it.lat, it.lon]); });
console.error(`pass 3: ${nodes.size} nodes`);

// Join way segments into closed rings by matching endpoints (multipolygon outers are often split).
function rings(wayIds) {
  const segs = wayIds.map(id => ways.get(id)).filter(r => r && r.length > 1).map(r => [...r]);
  const out = [];
  while (segs.length) {
    const ring = segs.shift();
    let grew = true;
    while (ring[0] !== ring[ring.length - 1] && grew) {
      grew = false;
      for (let i = 0; i < segs.length; i++) {
        const s = segs[i], last = ring[ring.length - 1];
        if (s[0] === last) { ring.push(...s.slice(1)); segs.splice(i, 1); grew = true; break; }
        if (s[s.length - 1] === last) { ring.push(...s.reverse().slice(1)); segs.splice(i, 1); grew = true; break; }
      }
    }
    const coords = ring.map(id => nodes.get(id)).filter(Boolean);
    if (coords.length > 2) out.push(coords);
  }
  return out;
}
// Shoelace on a lat/lon ring, in hectares; good enough at Iran's latitudes for a 1 ha threshold.
function areaHa(ring) {
  const lat0 = ring[0][0] * Math.PI / 180, kx = 111320 * Math.cos(lat0), ky = 110540;
  let a = 0;
  for (let i = 0; i < ring.length; i++) { const [y1, x1] = ring[i], [y2, x2] = ring[(i + 1) % ring.length]; a += (x1 * kx) * (y2 * ky) - (x2 * kx) * (y1 * ky); }
  return Math.abs(a) / 2 / 10000;
}
const centroid = coords => [coords.reduce((s, c) => s + c[0], 0) / coords.length, coords.reduce((s, c) => s + c[1], 0) / coords.length];

const out = [];
let dropped = 0;
for (const it of kept) {
  const rec = { type: it.type[0], id: it.id, tags: it.tags, ts: it.info?.timestamp ? new Date(it.info.timestamp).toISOString().slice(0, 10) : null };
  if (it.type === "node") { rec.lat = it.lat; rec.lon = it.lon; }
  else {
    const rs = rings(it.type === "way" ? [it.id] : it.members.filter(m => m.type === "way" && (m.role === "outer" || m.role === "")).map(m => m.id));
    if (!rs.length) { dropped++; continue; }
    const all = rs.flat();
    [rec.lat, rec.lon] = centroid(all);
    rec.areaHa = Math.round(rs.reduce((s, r) => s + areaHa(r), 0) * 100) / 100;
    if (isBoundary(it.tags)) rec.rings = rs.map(r => r.map(([la, lo]) => [Math.round(la * 1e5) / 1e5, Math.round(lo * 1e5) / 1e5]));
  }
  out.push(rec);
}
mkdirSync(new URL("../data/build/", import.meta.url), { recursive: true });
writeFileSync(outFile, JSON.stringify(out));
console.error(`wrote ${out.length} elements (${dropped} without geometry) to ${outFile}`);
