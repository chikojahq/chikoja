# chikoja — چی‌کجا

Essential places in every Iranian city, in Persian, working without internet.

chikoja ("what is where?") started as a directory of places in Iranian cities,
live around 2013–2015. It is being rebuilt as a free, non-profit site listing
essential places (hospitals, pharmacies, fuel, Red Crescent, fire stations,
police, drinking water and open spaces) city by city, with an offline copy of
each city that people can keep on their phone and share.

Right now https://chikoja.ir shows a short notice about the original project.

- Data: [OpenStreetMap](https://www.openstreetmap.org/) © OpenStreetMap
  contributors, [ODbL](https://opendatacommons.org/licenses/odbl/).
- No accounts, no ads, no analytics, no location tracking.
- Code: MIT (see LICENSE). Data: ODbL.
- Contact: chikojahq@gmail.com

## Develop

```sh
npm install
npm run dev          # local server
npm test             # tests
npm run screenshots  # page screenshots into screenshots/
```

The site is a Cloudflare Worker serving static files from `public/`.
