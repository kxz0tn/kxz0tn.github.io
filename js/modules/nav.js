/* nav: ambient ring + starfield view (theme: Spaceship! | Cross-universe travel) */
(function (K) {
  K.register({ name: "nav", group: "views", aliases: ["ring"], help: "ring — ambient nav display (esc exits)",
    run: function (a, sh) {
      sh.endMode();
      var box = document.createElement("div"); box.innerHTML = "<pre></pre><div class='d'>Esc to leave</div>"; sh.out.appendChild(box);
      var W = K.COLS - 2, H = 17, stars = [], t = 0;
      for (var i = 0; i < 110; i++) stars.push([Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random()]);
      function frame() {
        var g = []; for (var y = 0; y < H; y++) g.push(new Array(W).fill(" "));
        stars.forEach(function (st) {
          st[2] -= 0.012; if (st[2] <= 0.02) { st[0] = Math.random() * 2 - 1; st[1] = Math.random() * 2 - 1; st[2] = 1; }
          var x = Math.round(W / 2 + st[0] / st[2] * W / 6), yy = Math.round(H / 2 + st[1] / st[2] * H / 6);
          if (x >= 0 && x < W && yy >= 0 && yy < H) g[yy][x] = st[2] < 0.3 ? "*" : st[2] < 0.6 ? "+" : ".";
        });
        var R = H / 2 - 2;
        for (var d = 0; d < 360; d += 4) { var rad = d * Math.PI / 180, x2 = Math.round(W / 2 + Math.cos(rad) * R * 2.1), y2 = Math.round(H / 2 + Math.sin(rad) * R); if (g[y2] && x2 >= 0 && x2 < W) g[y2][x2] = (d + t * 8) % 90 < 8 ? "@" : "o"; }
        box.firstChild.textContent = "ring · " + K.utc() + " utc\n\n" + g.map(function (r) { return r.join(""); }).join("\n");
        t++;
      }
      frame();
      sh.mode = { type: "nav", anyKeyExits: true, timer: K.RM ? null : setInterval(frame, 90) };
      sh.scroll.scrollTop = sh.scroll.scrollHeight; return null;
    } });
})(window.KX);
