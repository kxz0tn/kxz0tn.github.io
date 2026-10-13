try { var t = localStorage.getItem("kx3-theme"); if (t === "light" || t === "dark") document.documentElement.dataset.theme = t; } catch (e) {}
