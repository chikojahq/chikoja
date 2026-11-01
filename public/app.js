// Everything runs on the device only; nothing is sent anywhere.
// Home-page city filter.
const q = document.getElementById("q");
if (q) {
  const items = [...document.querySelectorAll(".cities li")];
  const fold = s => s.normalize("NFC").replace(/[كک]/g, "ک").replace(/[يی]/g, "ی").replace(/‌/g, "").toLowerCase();
  q.addEventListener("input", () => {
    const v = fold(q.value.trim());
    for (const li of items) li.classList.toggle("hidden", v && !fold(li.dataset.n).includes(v));
    for (const sec of document.querySelectorAll(".province")) sec.classList.toggle("hidden", !sec.querySelector("li:not(.hidden)"));
  });
}
// "Save this city": the service worker caches the hub, its category pages and the pack.
const save = document.querySelector("[data-save]");
if (save && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js");
  save.hidden = false;
  const slug = save.dataset.save, saved = localStorage.getItem("city") === slug;
  if (saved) save.textContent = "این شهر ذخیره شده است";
  save.addEventListener("click", async () => {
    save.textContent = "در حال ذخیره…"; save.disabled = true;
    const base = `/${encodeURIComponent(slug)}/`;
    const urls = [base, ...[...document.querySelectorAll(".tile")].map(a => a.getAttribute("href")), `${base}${encodeURIComponent("بسته")}/`, save.dataset.pack];
    const reg = await navigator.serviceWorker.ready;
    navigator.serviceWorker.addEventListener("message", e => {
      if (e.data?.type !== "city-saved") return;
      localStorage.setItem("city", slug);
      save.textContent = e.data.done === e.data.total ? "ذخیره شد؛ بدون اینترنت هم باز می‌شود" : `ذخیره شد (${e.data.done} از ${e.data.total})`;
    }, { once: true });
    reg.active.postMessage({ type: "save-city", slug, urls });
  });
}
// Light/dark toggle.
const themeBtn = document.querySelector(".theme");
if (themeBtn) themeBtn.addEventListener("click", () => {
  const root = document.documentElement;
  const dark = root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  root.dataset.theme = dark ? "light" : "dark";
  try { localStorage.setItem("theme", root.dataset.theme); } catch {}
});
// Category page filters: text over name/address, badge chips, "has phone". All on the device.
const f = document.getElementById("f");
if (f) {
  const fold = s => s.normalize("NFC").replace(/[كک]/g, "ک").replace(/[يی]/g, "ی").replace(/‌/g, "").toLowerCase();
  const items = [...document.querySelectorAll(".place")], chips = [...document.querySelectorAll(".chip")];
  const apply = () => {
    const v = fold(f.value.trim()), on = chips.filter(c => c.getAttribute("aria-pressed") === "true");
    let n = 0;
    for (const li of items) {
      const ok = (!v || fold(li.dataset.t).includes(v)) && on.every(c => c.dataset.badge ? li.dataset.b.split("|").includes(c.dataset.badge) : li.hasAttribute("data-phone"));
      li.classList.toggle("hidden", !ok); if (ok) n++;
    }
    document.querySelector("[data-count]").textContent = String(n).replace(/\d/g, d => "۰۱۲۳۴۵۶۷۸۹"[d]);
    document.querySelector("[data-nomatch]").classList.toggle("hidden", n > 0);
  };
  f.addEventListener("input", apply);
  for (const c of chips) { c.setAttribute("aria-pressed", "false"); c.addEventListener("click", () => { c.setAttribute("aria-pressed", c.getAttribute("aria-pressed") === "true" ? "false" : "true"); apply(); }); }
}
// Recently viewed cities: remembered on this device only, shown on the home page.
try {
  const KEY = "recent", body = document.body;
  if (body.dataset.city) {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]").filter(c => c.slug !== body.dataset.city);
    list.unshift({ slug: body.dataset.city, name: body.dataset.cityName });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 8)));
  }
  const recent = document.querySelector(".recent");
  if (recent) {
    const list = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (list.length) {
      recent.querySelector("ul").innerHTML = list.map(c => { const a = document.createElement("a"); a.href = `/${encodeURIComponent(c.slug)}/`; a.textContent = c.name; return `<li>${a.outerHTML}</li>`; }).join("");
      recent.classList.remove("hidden");
    }
  }
} catch {}
