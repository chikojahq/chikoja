import { test } from "node:test";
import assert from "node:assert/strict";
import { categorize, badges, slugify, asciiSlug, pointInRings, distanceKm, placeRecord } from "../src/data.mjs";

test("tags map to categories", () => {
  assert.equal(categorize({ amenity: "hospital" }).en, "hospitals");
  assert.equal(categorize({ healthcare: "pharmacy" }).en, "pharmacies");
  assert.equal(categorize({ amenity: "fuel" }).en, "fuel");
  assert.equal(categorize({ emergency: "ambulance_station" }).en, "red-crescent");
  assert.equal(categorize({ amenity: "clinic", operator: "هلال احمر" }).en, "red-crescent");
  assert.equal(categorize({ man_made: "water_tap" }), null, "a tap without drinking_water=yes is not water");
  assert.equal(categorize({ man_made: "water_tap", drinking_water: "yes" }).en, "water");
  assert.equal(categorize({ leisure: "park" }, { areaHa: 0.4 }), null, "small parks are not shelter");
  assert.equal(categorize({ leisure: "park" }, { areaHa: 1.2 }).en, "shelter");
  assert.equal(categorize({ emergency: "assembly_point" }).en, "shelter");
  assert.equal(categorize({ shop: "bakery" }), null);
});

test("badges and sort-first", () => {
  const ph = categorize({ amenity: "pharmacy" });
  assert.deepEqual(badges({ amenity: "pharmacy", opening_hours: "24/7" }, ph), { badges: ["شبانه‌روزی (طبق OSM)"], first: true });
  assert.deepEqual(badges({ amenity: "pharmacy", opening_hours: "Mo-Fr 08:00-20:00" }, ph), { badges: [], first: false });
  const fuel = categorize({ amenity: "fuel" });
  assert.deepEqual(badges({ amenity: "fuel", name: "جایگاه CNG آزادی", "fuel:cng": "yes" }, fuel).badges, ["CNG"], "CNG once, not twice");
  const hosp = categorize({ amenity: "hospital" });
  assert.equal(badges({ amenity: "hospital", emergency: "yes" }, hosp).first, true);
});

test("slugs", () => {
  assert.equal(slugify("حسن آباد"), "حسن-آباد");
  assert.equal(slugify("كرج"), "کرج", "arabic kaf is folded");
  assert.equal(slugify("بندر‌عباس"), "بندرعباس", "ZWNJ dropped");
  assert.equal(asciiSlug("Bandar-e Abbas", 1), "bandar-e-abbas");
  assert.equal(asciiSlug("مشهد", 42), "city-42", "no latin letters → id fallback");
});

test("place record keeps a Persian name and a latin alias", () => {
  const r = placeRecord({ type: "n", id: 5, lat: 36.3, lon: 59.6, ts: "2025-01-02", tags: { amenity: "hospital", name: "بیمارستان رضوی", "name:en": "Razavi Hospital", phone: "+98 51 1234", emergency: "yes" } }, categorize({ amenity: "hospital" }));
  assert.equal(r.id, "n5"); assert.equal(r.en, "Razavi Hospital"); assert.equal(r.first, 1); assert.equal(r.checked, "2025-01-02");
});

test("geometry helpers", () => {
  const sq = [[[0, 0], [0, 1], [1, 1], [1, 0]]];
  assert.equal(pointInRings(0.5, 0.5, sq), true);
  assert.equal(pointInRings(1.5, 0.5, sq), false);
  assert.ok(Math.abs(distanceKm(35.6892, 51.389, 36.2605, 59.6168) - 740) < 20, "Tehran–Mashhad ≈ 740 km");
});
