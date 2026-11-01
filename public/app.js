// Home-page city filter. Runs only on the device; nothing is sent anywhere.
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
