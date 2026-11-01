// Generates dist/ from data/build: home, city hubs, category pages, pack pages,
// About, OSM guide, 404 and the English-alias redirects. Static files in public/ are copied over.
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, readdirSync } from "node:fs";
import { shell, esc, fa, jalali, phoneBar, place, PHONES } from "../src/html.mjs";
import { categories } from "../src/data.mjs";

const { built, cities } = JSON.parse(readFileSync("data/build/cities.json"));
const out = "dist";
rmSync(out, { recursive: true, force: true }); mkdirSync(out, { recursive: true });
cpSync("public", out, { recursive: true });
const write = (path, html) => { const dir = `${out}${path}`; mkdirSync(dir, { recursive: true }); writeFileSync(`${dir}/index.html`, html); };
const cityUrl = c => `/${c.slug}/`;
const catUrl = (c, cat) => `/${c.slug}/${cat.slug}/`;
let files = 0;

// Home: cities by province with a client-side filter.
const byProv = new Map();
for (const c of cities) { const k = c.province || "سایر"; if (!byProv.has(k)) byProv.set(k, []); byProv.get(k).push(c); }
const provs = [...byProv.entries()].sort((a, b) => b[1].reduce((s, c) => s + c.total, 0) - a[1].reduce((s, c) => s + c.total, 0));
write("/", shell({ title: "جاهای ضروری هر شهر ایران", path: "/", built, body: `<h1>چی‌کجا</h1><p class="lead">بیمارستان، داروخانه، سوخت، آب، پلیس، آتش‌نشانی، هلال احمر و فضای امن هر شهر ایران؛ به فارسی و بدون اینترنت.</p>${phoneBar()}
<label for="q" class="hidden">جست‌وجوی شهر</label><input id="q" class="search" type="search" placeholder="نام شهر…" autocomplete="off">
${provs.map(([p, cs]) => `<section class="province"><h2>${esc(p)}</h2><ul class="cities">${cs.map(c => `<li data-n="${esc(c.name)}"><a href="${encodeURI(cityUrl(c))}">${esc(c.name)}${c.total ? ` <small>${fa(c.total)}</small>` : ""}</a></li>`).join("")}</ul></section>`).join("")}` })); files++;

const cityDir = "data/build/city";
for (const c of cities) {
  const data = JSON.parse(readFileSync(`${cityDir}/${c.en}.json`));
  const tiles = categories.map(cat => `<a class="tile" href="${encodeURI(catUrl(c, cat))}"><span class="ico">${cat.icon}</span><span class="t">${cat.title}</span><span class="n">${fa(c.counts[cat.en] || 0)} مکان</span></a>`).join("");
  write(cityUrl(c), shell({ title: c.name, path: encodeURI(cityUrl(c)), built, city: c, desc: `جاهای ضروری ${c.name}: بیمارستان، داروخانه، سوخت، آب و فضای امن`, body: `<h1>${esc(c.name)} <small>${esc(c.province || "")}</small></h1>${phoneBar()}<div class="tiles">${tiles}</div>
<section class="offline"><h2>بدون اینترنت</h2><p>این شهر را روی گوشی نگه دارید یا بسته‌ی یک‌فایلی را دانلود و در تلگرام یا بله برای دیگران بفرستید.</p><div class="actions"><button class="btn call" data-save="${esc(c.slug)}" data-pack="/packs/${c.en}.html" hidden>ذخیره‌ی این شهر روی گوشی</button><a class="btn" href="/packs/${c.en}.html" download>دانلود بسته‌ی آفلاین</a><a class="btn ghost" href="${encodeURI(cityUrl(c))}بسته/">بسته چیست؟</a></div></section>` })); files++;
  for (const cat of categories) {
    const items = data.places.filter(p => p.cat === cat.en);
    const note = cat.en === "shelter" ? `<p class="note">${items.some(p => !p.badges.length) ? "" : "در OSM پناهگاه رسمی برای این شهر ثبت نشده است. "}پارک‌های بزرگ فقط فضای باز هستند؛ به توصیه‌ی مقامات محلی عمل کنید.</p>` : "";
    const body = `<p class="crumbs"><a href="${encodeURI(cityUrl(c))}">${esc(c.name)}</a></p><h1>${cat.title} <small>${esc(c.name)}</small></h1>${phoneBar()}${note}` +
      (items.length ? `<p class="count">${fa(items.length)} مکان · ترتیب: اول موارد نشان‌دار، سپس نام</p><ol class="places">${items.map(p => place(p)).join("")}</ol>` :
        `<div class="empty"><p>هنوز ${cat.title} برای ${esc(c.name)} در OpenStreetMap ثبت نشده است.</p><p><a href="/راهنما/ویرایش/">چطور اضافه کنم؟</a></p></div>`);
    write(catUrl(c, cat), shell({ title: `${cat.title} ${c.name}`, path: encodeURI(catUrl(c, cat)), built, city: c, body })); files++;
  }
  write(`${cityUrl(c)}بسته/`, shell({ title: `بسته‌ی آفلاین ${c.name}`, path: encodeURI(`${cityUrl(c)}بسته/`), built, city: c, bodyClass: "prose", body: `<h1>بسته‌ی آفلاین <small>${esc(c.name)}</small></h1><p>بسته یک فایل HTML است با همه‌ی جاهای ضروری ${esc(c.name)} و شماره‌های اضطراری. بدون اینترنت باز می‌شود و می‌توانید آن را در تلگرام، بله، ایتا یا بلوتوث برای دیگران بفرستید.</p><div class="actions"><a class="btn call" href="/packs/${c.en}.html" download>دانلود بسته‌ی ${esc(c.name)}</a></div><h2>چطور باز کنم؟</h2><ol><li>فایل را دانلود کنید.</li><li>در پوشه‌ی دانلودها یا در همان پیام‌رسان روی فایل بزنید؛ با مرورگر گوشی باز می‌شود.</li><li>شماره‌ها قابل لمس‌اند و بدون اینترنت کار می‌کنند.</li></ol><p class="pack-note">داده‌ها از OpenStreetMap و تا تاریخ ${jalali(built)} است. اگر جایی اشتباه است، <a href="/راهنما/ویرایش/">خودتان اصلاحش کنید</a>.</p>` })); files++;
}

write("/درباره/", shell({ title: "درباره", path: encodeURI("/درباره/"), built, bodyClass: "prose", body: `<h1>درباره‌ی چی‌کجا</h1><p>چی‌کجا فهرست جاهای ضروری هر شهر ایران است: بیمارستان و اورژانس، داروخانه، پمپ بنزین و CNG، هلال احمر، آتش‌نشانی، پلیس، آب آشامیدنی و فضای امن. به فارسی، سبک، و طوری که بدون اینترنت هم کار کند.</p><h2>داده‌ها از کجاست؟</h2><p>همه‌ی داده‌ها از <a href="https://www.openstreetmap.org/" rel="noopener">OpenStreetMap</a> می‌آید، نقشه‌ی آزادی که هر کسی می‌تواند اصلاحش کند، و هر هفته به‌روز می‌شود. چی‌کجا چیزی را تأیید نمی‌کند: اگر OSM بگوید داروخانه‌ای شبانه‌روزی است، ما هم همان را می‌گوییم و تاریخ آخرین بررسی را کنار آن می‌نویسیم. داده‌ها تحت مجوز ODbL و کد سایت تحت مجوز MIT است.</p><h2>حریم خصوصی</h2><p>هیچ ردیاب، آمارگیر یا فرمی در کار نیست. سایت هیچ درخواستی به سرور دیگری نمی‌فرستد. اگر موقعیت مکانی‌تان را برای مرتب‌سازی بدهید، فقط روی دستگاه خودتان استفاده می‌شود.</p><h2>تاریخچه</h2><p>چی‌کجا بین سال‌های ۲۰۱۳ تا ۲۰۱۵ راهنمای جاهای شهرهای ایران بود. در سال ۲۰۲۶ با تمرکز بر جاهای ضروری و کار بدون اینترنت از نو ساخته شد.</p><h2>تماس</h2><p>ایمیل: <a href="mailto:chikojahq@gmail.com">chikojahq@gmail.com</a> · کد: <a href="https://github.com/chikojahq/chikoja" rel="noopener">github.com/chikojahq/chikoja</a></p>` })); files++;

write("/راهنما/ویرایش/", shell({ title: "اصلاح داده‌ها", path: encodeURI("/راهنما/ویرایش/"), built, bodyClass: "prose", body: `<h1>جایی اشتباه است یا نیست؟</h1><p>داده‌های چی‌کجا از OpenStreetMap می‌آید. هر اصلاحی که آن‌جا بکنید، در به‌روزرسانی هفتگی بعدی این‌جا هم دیده می‌شود، و در هر نقشه و اپ دیگری که از OSM استفاده می‌کند.</p><h2>با گوشی (ساده‌ترین راه)</h2><ul><li><b>StreetComplete</b> (اندروید): سؤال‌های ساده مثل «ساعت کار این داروخانه؟» را جواب می‌دهید.</li><li><b>Every Door</b> (اندروید و iOS): برای اضافه کردن یا اصلاح مغازه‌ها و مراکز، سریع و دقیق.</li><li><b>OsmAnd</b>: در تنظیمات، «ویرایش OSM» را فعال کنید و روی نقشه مکان را اضافه کنید.</li></ul><h2>با کامپیوتر</h2><ol><li>در <a href="https://www.openstreetmap.org/user/new" rel="noopener">openstreetmap.org</a> حساب بسازید.</li><li>در هر مکان چی‌کجا، روی «اشتباه است؟» بزنید تا همان مکان در ویرایشگر iD باز شود.</li><li>برچسب‌ها را اصلاح کنید (نام، تلفن، ساعت کار) و ذخیره کنید.</li></ol><h2>کدام برچسب‌ها را می‌خوانیم؟</h2><p><code>name</code> و <code>name:fa</code>، <code>phone</code>، <code>opening_hours</code> (مثلاً <code dir="ltr">24/7</code>)، <code>emergency=yes</code> برای اورژانس بیمارستان، <code>fuel:cng=yes</code> برای CNG، <code>drinking_water=yes</code> برای آب، <code>emergency=assembly_point</code> برای محل تجمع امن.</p>` })); files++;

writeFileSync(`${out}/404.html`, shell({ title: "پیدا نشد", path: "/404", built, body: `<h1>پیدا نشد</h1><p>چنین صفحه‌ای نیست. شاید نام شهر عوض شده باشد؛ از <a href="/">فهرست شهرها</a> شروع کنید.</p>` })); files++;
// English aliases → Persian URLs, resolved by the Worker (Cloudflare's _redirects allows only 100 splat rules).
writeFileSync("src/aliases.json", JSON.stringify({ cities: Object.fromEntries(cities.map(c => [c.en, c.slug])), categories: Object.fromEntries(categories.map(k => [k.en, k.slug])) }));
writeFileSync(`${out}/manifest.webmanifest`, JSON.stringify({ name: "چی‌کجا", short_name: "چی‌کجا", start_url: "/", display: "standalone", background_color: "#f6f3ee", theme_color: "#b4532a", dir: "rtl", lang: "fa", icons: [{ src: "/logo.svg", sizes: "any", type: "image/svg+xml" }] }));
console.error(`wrote ${files} pages for ${cities.length} cities`);
