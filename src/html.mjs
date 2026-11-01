// Page shell and shared pieces for the generated site (design A, owner choice 2026-11-01).
export const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
export const fa = s => String(s).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
export const jalali = iso => iso ? new Intl.DateTimeFormat("fa-IR-u-ca-persian", { dateStyle: "medium" }).format(new Date(iso)) : "نامشخص";
export const ATTR = `داده‌ها: © <a href="https://www.openstreetmap.org/copyright" rel="license">مشارکت‌کنندگان OpenStreetMap</a>، ODbL`;
export const PHONES = [["115", "اورژانس"], ["125", "آتش‌نشانی"], ["110", "پلیس"], ["112", "امداد هلال احمر"]];

export function shell({ title, path, body, built, desc, city, bodyClass = "" }) {
  return `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} — چی‌کجا</title>
<meta name="description" content="${esc(desc || "جاهای ضروری هر شهر ایران، به فارسی، بدون اینترنت")}">
<link rel="canonical" href="https://chikoja.ir${path}">
<script src="/theme.js"></script>
<link rel="stylesheet" href="/style.css">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="/manifest.webmanifest">
<meta name="theme-color" content="#b4532a">
<meta name="data-date" content="${esc(built)}">
</head>
<body class="${bodyClass}"${city ? ` data-city="${esc(city.slug)}" data-city-name="${esc(city.name)}"` : ""}>
<header class="top"><a class="brand" href="/">چی‌کجا</a><nav>${city ? `<a href="/${encodeURI(city.slug)}/">${esc(city.name)}</a>` : ""}<a href="/">شهرها</a><button class="theme" type="button" aria-label="تغییر تم روشن و تیره"><span class="to-dark">🌙 تیره</span><span class="to-light">☀️ روشن</span></button></nav></header>
<main>${body}</main>
<footer>${ATTR} · به‌روزرسانی داده‌ها: ${jalali(built)} · <a href="/درباره/">درباره</a> · <a href="/راهنما/ویرایش/">اصلاح داده‌ها</a></footer>
<script src="/app.js" defer></script>
</body>
</html>`;
}

export const phoneBar = () => `<section class="phones" aria-label="شماره‌های اضطراری">${PHONES.map(([n, l]) => `<a class="phone" href="tel:${n}"><b>${fa(n)}</b><span>${l}</span></a>`).join("")}</section>`;

export const mapLinks = p => `<a class="btn" href="geo:${p.lat},${p.lon}?q=${p.lat},${p.lon}(${encodeURIComponent(p.name)})">نقشه</a><a class="btn ghost" href="https://www.openstreetmap.org/${p.id[0] === "n" ? "node" : p.id[0] === "w" ? "way" : "relation"}/${p.id.slice(1)}" rel="noopener">OSM</a><a class="btn ghost" href="https://neshan.org/maps/@${p.lat},${p.lon},17z" rel="noopener">نشان</a>`;

export function place(p, { compact = false } = {}) {
  const osmEdit = `https://www.openstreetmap.org/edit?${p.id[0] === "n" ? "node" : p.id[0] === "w" ? "way" : "relation"}=${p.id.slice(1)}`;
  return `<li class="place" id="${p.id}" data-t="${esc([p.name, p.en, p.suburb, p.street].filter(Boolean).join(" "))}" data-b="${esc(p.badges.join("|"))}"${p.phone ? " data-phone" : ""}><div class="head"><h3>${esc(p.name)}${p.en ? ` <span class="en" dir="ltr">${esc(p.en)}</span>` : ""}</h3>${p.badges.map(b => `<span class="badge">${esc(b)}</span>`).join("")}</div>
${p.street || p.suburb ? `<p class="addr">${esc([p.suburb, p.street].filter(Boolean).join("، "))}</p>` : ""}
${p.hours ? `<p class="hours">ساعت کار (طبق OSM): <span dir="ltr">${esc(p.hours)}</span></p>` : ""}
<div class="actions">${p.phone ? `<a class="btn call" href="tel:${esc(p.phone.replace(/\s/g, ""))}">تماس <span dir="ltr">${fa(esc(p.phone))}</span></a>` : ""}${compact ? "" : mapLinks(p)}${compact ? "" : `<a class="btn ghost" href="${osmEdit}" rel="noopener">اشتباه است؟</a>`}</div>
<p class="meta">آخرین بررسی در OSM&rlm;: ${jalali(p.checked)}</p></li>`;
}
