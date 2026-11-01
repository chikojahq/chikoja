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
