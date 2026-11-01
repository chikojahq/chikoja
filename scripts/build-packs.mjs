// One self-contained HTML file per city: all categories, emergency numbers,
// inline CSS, system fonts, no scripts. Opens from a chat download with no network.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from "node:fs";
import { gzipSync } from "node:zlib";
import { esc, fa, jalali, PHONES } from "../src/html.mjs";
import { categories } from "../src/data.mjs";

const { built, cities } = JSON.parse(readFileSync("data/build/cities.json"));
const out = "dist/packs"; mkdirSync(out, { recursive: true });
const CSS = `:root{--bg:#f6f3ee;--card:#fff;--text:#1f2328;--muted:#5b6168;--accent:#b4532a;--on-accent:#fff;--border:#e4ddd2;--badge-bg:#f3e6dc;--badge-text:#7a3a1c;--btn:#fff;--r:12px}
@media(prefers-color-scheme:dark){:root{--bg:#16181c;--card:#1f2227;--text:#e8e6e3;--muted:#a3a8af;--accent:#e08a5e;--on-accent:#1f1410;--border:#33373d;--badge-bg:#3a2a22;--badge-text:#f1c9b2;--btn:#272b31}}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,"Vazirmatn",Tahoma,sans-serif;font-size:17px;line-height:1.55}
main{max-width:720px;margin:0 auto;padding:12px 12px 40px}
h1{font-size:1.8rem;margin:8px 0 4px}h1 small,h2 small{font-size:.9rem;color:var(--muted);font-weight:400}
h2{font-size:1.25rem;margin:28px 0 10px;padding-bottom:6px;border-bottom:2px solid var(--accent)}
.ph{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0 14px}
.ph a{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:64px;border:1px solid var(--border);border-radius:var(--r);background:var(--card);color:var(--text);text-decoration:none}
.ph b{font-size:1.5rem;color:var(--accent);line-height:1.2}.ph span{font-size:.78rem}
.n{padding:12px 16px;border-radius:var(--r);background:var(--card);border:1px solid var(--border);border-inline-start:4px solid var(--accent);margin:8px 0}
nav{display:flex;flex-wrap:wrap;gap:8px;margin:12px 0}
nav a{display:inline-flex;align-items:center;min-height:44px;padding:0 14px;border-radius:999px;background:var(--card);border:1px solid var(--border);color:var(--text);text-decoration:none;font-size:.95rem;font-weight:600}
ol{list-style:none;padding:0;margin:0}
.p{padding:12px 14px;margin:10px 0;border:1px solid var(--border);border-radius:var(--r);background:var(--card)}
.p h3{display:inline;font-size:1.05rem;margin:0}
.b{display:inline-block;font-size:.75rem;padding:2px 10px;border-radius:999px;background:var(--badge-bg);color:var(--badge-text);font-weight:600;margin-inline-start:6px;vertical-align:middle}
.a{margin:6px 0 0;color:var(--muted);font-size:.95rem}
.act{display:flex;flex-wrap:wrap;gap:8px;margin-top:10px}
.act a{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:44px;padding:0 16px;border-radius:var(--r);border:1px solid var(--border);background:var(--btn);color:var(--text);text-decoration:none;font-weight:600}
.act a.c{background:var(--accent);color:var(--on-accent);border-color:var(--accent)}
.e{padding:16px;text-align:center;color:var(--muted);background:var(--card);border:1px dashed var(--border);border-radius:var(--r)}
footer{font-size:.8rem;color:var(--muted);margin-top:28px;text-align:center}`;
const pl = p => `<li class="p"><h3>${esc(p.name)}</h3>${p.badges.map(b => `<span class="b">${esc(b)}</span>`).join("")}${p.street || p.suburb ? `<div class="a">${esc([p.suburb, p.street].filter(Boolean).join("، "))}</div>` : ""}${p.hours ? `<div class="a">ساعت کار (OSM): <span dir="ltr">${esc(p.hours)}</span></div>` : ""}<div class="act">${p.phone ? `<a class="c" href="tel:${esc(p.phone.replace(/\s/g, ""))}">تماس <span dir="ltr">${fa(esc(p.phone))}</span></a>` : ""}<a href="geo:${p.lat},${p.lon}">نقشه</a></div></li>`;
let maxGz = 0, maxCity = "";
for (const c of cities) {
  const { places } = JSON.parse(readFileSync(`data/build/city/${c.en}.json`));
  const sections = categories.map(cat => { const items = places.filter(p => p.cat === cat.en); return `<h2 id="${cat.en}">${cat.icon} ${cat.title} <small>${fa(items.length)}</small></h2>` + (items.length ? `<ol>${items.map(pl).join("")}</ol>` : `<div class="e">در OpenStreetMap ثبت نشده است.</div>`); }).join("");
  const html = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><link rel="canonical" href="https://chikoja.ir/${encodeURI(c.slug)}/"><title>${esc(c.name)} — بسته‌ی آفلاین چی‌کجا</title><style>${CSS}</style></head><body><main><h1>${esc(c.name)} <small>${esc(c.province || "")} · بسته‌ی آفلاین چی‌کجا</small></h1><div class="ph">${PHONES.map(([n, l]) => `<a href="tel:${n}"><b>${fa(n)}</b><span>${l}</span></a>`).join("")}</div><div class="n">این فایل بدون اینترنت کار می‌کند. آن را برای دیگران بفرستید. داده‌ها از OpenStreetMap تا ${jalali(built)}؛ چی‌کجا چیزی را تأیید نمی‌کند.</div><nav>${categories.map(cat => `<a href="#${cat.en}">${cat.title}</a>`).join("")}</nav>${sections}<footer>© مشارکت‌کنندگان OpenStreetMap، ODbL · ${jalali(built)} · chikoja.ir/${esc(c.slug)}/</footer></main></body></html>`;
  writeFileSync(`${out}/${c.en}.html`, html);
  const gz = gzipSync(html).length; if (gz > maxGz) { maxGz = gz; maxCity = c.en; }
}
console.error(`wrote ${cities.length} packs; largest gzipped ${maxCity} ${Math.round(maxGz / 1024)} KB`);
