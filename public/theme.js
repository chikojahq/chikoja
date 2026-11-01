// Applies the saved theme before the first paint; the choice stays on this device only.
try { const t = localStorage.getItem("theme"); if (t === "dark" || t === "light") document.documentElement.dataset.theme = t; } catch {}
