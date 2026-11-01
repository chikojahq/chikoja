# chikoja — چی‌کجا

Essential places in every Iranian city, in Persian, working without internet.

https://chikoja.ir lists, for every Iranian city and town, the places that
matter in a hard moment: hospitals and emergency rooms, pharmacies (24/7
first), fuel and CNG, Red Crescent, fire stations, police, drinking water and
safe open spaces. The national emergency numbers sit on top of every page.

- Persian, light pages, works on any phone.
- **Offline:** "save this city" keeps a city on the phone, and every city has a
  one-file pack (`/packs/<city>`) that can be sent on in a chat and opened
  without a network.
- Every place links to OpenStreetMap, so anyone can fix what is wrong.
- The data is rebuilt from OpenStreetMap every week; each page shows its date.

chikoja ("what is where?") was a directory of places in Iranian cities around
2013–2015 and came back in 2026 with this narrower purpose.

- Data: [OpenStreetMap](https://www.openstreetmap.org/) © OpenStreetMap
  contributors, [ODbL](https://opendatacommons.org/licenses/odbl/).
- No accounts, no ads, no analytics, no location tracking.
- Code: MIT (see LICENSE). Data: ODbL.
- Contact: chikojahq@gmail.com

## Develop

```sh
npm install
# data: download the OSM Iran extract (Geofabrik), then
node scripts/extract.mjs iran-latest.osm.pbf   # scripts/extract → data/build/extract.json
npm run build        # data/build → dist/ (pages and packs)
npm run dev          # local server
npm test             # unit, site and offline tests
npm run screenshots  # page screenshots into screenshots/
```

`data/categories.json` maps OSM tags to the eight categories. The site is
static files in `dist/`, served by a small Cloudflare Worker.
