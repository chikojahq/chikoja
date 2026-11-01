// Shared data rules: tag → category/badge, slugs, geometry helpers. Used by the
// build and by the unit tests.
import { readFileSync } from "node:fs";
export const categories = JSON.parse(readFileSync(new URL("../data/categories.json", import.meta.url)));

export function categorize(tags, el = {}) {
  for (const c of categories) {
    for (const [k, v] of c.match) {
      if (tags[k] !== v) continue;
      const req = c.require?.[k];
      if (req && !Object.entries(req).every(([rk, rv]) => tags[rk] === rv)) continue;
      const minHa = c.minAreaHa?.[k];
      if (minHa && !(el.areaHa >= minHa)) continue;
      return c;
    }
    if (c.nameMatch && new RegExp(c.nameMatch).test([tags.name, tags["name:fa"], tags.operator, tags.brand].filter(Boolean).join(" "))) return c;
  }
  return null;
}

export function badges(tags, cat) {
  const out = []; let first = false;
  for (const b of cat.badges) {
    const hit = b.tag ? tags[b.tag] === b.value : new RegExp(b.nameMatch, "i").test(tags.name || "");
    if (hit && !out.includes(b.label)) { out.push(b.label); if (b.first) first = true; }
  }
  return { badges: out, first };
}

export function placeRecord(e, cat) {
  const t = e.tags, b = badges(t, cat);
  return { id: e.type + e.id, cat: cat.en, name: fold(t["name:fa"] || t.name || cat.title), en: t["name:en"] || (t.name && /^[A-Za-z]/.test(t.name) ? t.name : null),
    badges: b.badges, first: b.first ? 1 : 0, street: t["addr:street"] || null, suburb: t["addr:suburb"] || t["addr:neighbourhood"] || t["addr:district"] || null,
    phone: t.phone || t["contact:phone"] || null, hours: t.opening_hours || null, checked: t.check_date || e.ts || null,
    lat: Math.round(e.lat * 1e5) / 1e5, lon: Math.round(e.lon * 1e5) / 1e5, wheelchair: t.wheelchair || null };
}

// Arabic kaf/yeh → Persian, so «شيراز» and «شیراز» are one name.
export const fold = s => s.normalize("NFC").replace(/[كک]/g, "ک").replace(/[يی]/g, "ی").trim();
// Persian slug: fold, drop ZWNJ and punctuation, spaces → "-".
export const slugify = s => s.normalize("NFC").replace(/[كک]/g, "ک").replace(/[يی]/g, "ی").replace(/‌/g, "").replace(/[()،,.:'"«»]/g, "").trim().replace(/\s+/g, "-");
export const asciiSlug = (s, fallback) => { const a = s.normalize("NFKD").replace(/[^\x20-\x7e]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); return a || `city-${fallback}`; };

export function pointInRings(lat, lon, rings) {
  let inside = false;
  for (const ring of rings) for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [yi, xi] = ring[i], [yj, xj] = ring[j];
    if ((yi > lat) !== (yj > lat) && lon < (xj - xi) * (lat - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
export function distanceKm(lat1, lon1, lat2, lon2) {
  const r = Math.PI / 180, dLat = (lat2 - lat1) * r, dLon = (lon2 - lon1) * r;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}
