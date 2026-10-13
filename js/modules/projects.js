/* projects: projects open map */
(function (K) {
  var L = K.L, T = K.T, pad = K.pad, P = K.PROJECTS, D = document;
  function names() { return P.map(function (p) { return p.name; }); }
  K.register({ name: "projects", group: "projects", help: "list all projects",
    run: function () {
      var out = [L(T(pad("#", 4) + pad("name", 19) + pad("class", 24) + "state", "d"))];
      P.forEach(function (p) { out.push(L(T(pad(K.z(p.i + 1), 4), "d"), T(pad(p.name, 19), "h"), T(pad(p.klass, 24), "d"), T(p.state, p.state === "LIVE" ? "h" : "d"))); });
      return out;
    } });
  K.register({ name: "open", group: "projects", help: "open <project> — details, then launch (Enter / y)", complete: names,
    paletteItems: function () { return P.map(function (p) { return { label: "open " + p.name, hint: p.klass, run: "open " + p.name }; }); }, palette: false,
    run: function (a, sh) {
      var p = K.findProject(a[0]); if (!p) return [L(T("err: unknown project: " + (a[0] || "")))];
      sh.mode = { type: "confirm", p: p };
      return K.node("/projects/" + p.name).read().slice(0, 4).concat([[], L(T("exec: open " + p.url.replace("https://", "") + " ", "h"), T("[Y/n]", "d"))]);
    } });
  K.register({ name: "map", group: "projects", help: "project map — arrows move, Enter details, Esc exit",
    run: function (a, sh) {
      sh.endMode();
      var box = D.createElement("div"); box.innerHTML = "<pre></pre><div></div><div class='d'>arrows move · Enter details · Esc exit</div>"; box.setAttribute("aria-live", "polite"); sh.out.appendChild(box);
      var m = { type: "map", sel: 0, rows: [] }; for (var q = 0; q < P.length; q += 2) m.rows.push(q + 1 < P.length ? [q, q + 1] : [q]);
      function draw() {
        var pre = box.firstChild; pre.textContent = "";
        var lab = function (k) { return "[ " + P[k].name + " ]"; }, c0 = Math.max.apply(null, m.rows.map(function (r) { return lab(r[0]).length; })), x1 = c0 + 6;
        function seg(t, cls) { var sp = D.createElement("span"); sp.className = cls; sp.textContent = t; pre.appendChild(sp); }
        m.rows.forEach(function (row, r) {
          seg(lab(row[0]), row[0] === m.sel ? "i" : "h");
          if (row[1] !== undefined) { seg(" " + "─".repeat(x1 - lab(row[0]).length - 2) + " ", "d"); seg(lab(row[1]), row[1] === m.sel ? "i" : "h"); }
          pre.appendChild(D.createTextNode("\n"));
          if (r < m.rows.length - 1) seg(("  │" + (m.rows[r + 1][1] !== undefined ? " ".repeat(x1 - 1) + "│" : "")) + "\n", "d");
        });
        var p = P[m.sel]; box.children[1].textContent = "› " + p.name + " · " + p.klass + " · " + p.state;
      }
      m.onKey = function (e) {
        var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return false;
        var r, c; m.rows.forEach(function (row, ri) { var ci = row.indexOf(m.sel); if (ci >= 0) { r = ri; c = ci; } });
        r += d[1]; if (r >= 0 && r < m.rows.length) { c = Math.max(0, Math.min(m.rows[r].length - 1, c + d[0])); m.sel = m.rows[r][c]; draw(); }
        return true;
      };
      m.onEnter = function (s) { s.emit(K.node("/projects/" + P[m.sel].name).read(), true); };
      m.stop = function () { box.removeAttribute("aria-live"); };
      sh.mode = m; draw(); sh.scroll.scrollTop = sh.scroll.scrollHeight; return null;
    } });
})(window.KX);
