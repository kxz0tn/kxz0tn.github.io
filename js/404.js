document.getElementById("p").textContent = location.pathname;
function home() { location.href = "/"; }
addEventListener("keydown", home); addEventListener("pointerup", home);
var q = document.getElementById("p2"); if (q) q.textContent = location.pathname;
