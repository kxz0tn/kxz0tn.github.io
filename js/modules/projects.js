/* projects: projects open map last + hidden warp */
(function (K) {
  var L = K.L, T = K.T, pad = K.pad, P = K.PROJECTS, D = document;
  function names() { return P.map(function (p) { return p.name; }); }
  function here(sh) { var m = sh.cwd.match(/^\/projects\/([^/]+)/); return m ? K.findProject(m[1]) : null; }
  K.register({ name: "projects", group: "projects", help: "project table",
    man: { synopsis: "projects", description: "Table of all projects: name, class, state." },
    run: function () {
      var out = [L(T(pad("#", 4) + pad("name", 19) + pad("class", 24) + "state", "d"))];
      P.forEach(function (p) { out.push(L(T(pad(K.z(p.i + 1), 4), "d"), T(pad(p.name, 19), "h"), T(pad(p.klass, 24), "d"), T(p.state, p.state === "LIVE" ? "h" : "d"))); });
      return out;
    } });
  K.register({ name: "open", group: "projects", help: "launch a project", complete: function () { return names().concat(["."]); },
    man: { synopsis: "open <project> | open .", description: "Show a project and launch it in a new tab after confirmation (Enter / y). Inside /projects/<name>, open . launches that project." },
    run: function (a, sh) {
      var p = (a[0] === "." || !a[0]) ? here(sh) : K.findProject(a[0]);
      if (!p) return [L(T(a[0] === "." || !a[0] ? "err: open: not inside a project" : "err: unknown project: " + a[0]))];
      sh.confirm(p); return null;
    } });
  K.register({ name: "map", group: "projects", help: "project map",
    man: { synopsis: "map", description: "Grid of projects. Arrow keys move, Enter reads the selection, Esc leaves." },
    run: function (a, sh) {
      sh.endMode();
      var box = D.createElement("div"); box.innerHTML = "<pre></pre><div class='d'>esc</div>"; box.setAttribute("aria-live", "polite"); sh.out.appendChild(box);
      var m = { type: "map", sel: 0, rows: [] }; for (var q = 0; q < P.length; q += 2) m.rows.push(q + 1 < P.length ? [q, q + 1] : [q]);
      function draw() {
        var pre = box.firstChild; pre.textContent = "";
        var lab = function (k) { return "[ " + P[k].name + " ]"; }, c0 = Math.max.apply(null, m.rows.map(function (r) { return lab(r[0]).length; })), x1 = c0 + 6;
        function seg(t, cls) { var sp = D.createElement("span"); sp.className = cls; sp.textContent = t; pre.appendChild(sp); }
        m.rows.forEach(function (row, r) {
          seg(lab(row[0]), row[0] === m.sel ? "i" : "h");
          if (row[1] !== undefined) { seg(" " + "-".repeat(x1 - lab(row[0]).length - 2) + " ", "d"); seg(lab(row[1]), row[1] === m.sel ? "i" : "h"); }
          pre.appendChild(D.createTextNode("\n"));
          if (r < m.rows.length - 1) seg(("  │" + (m.rows[r + 1][1] !== undefined ? " ".repeat(x1 - 3) + "│" : "")) + "\n", "d");
        });
      }
      m.onKey = function (e) {
        var d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (!d) return false;
        var r, c; m.rows.forEach(function (row, ri) { var ci = row.indexOf(m.sel); if (ci >= 0) { r = ri; c = ci; } });
        r += d[1]; if (r >= 0 && r < m.rows.length) { c = Math.max(0, Math.min(m.rows[r].length - 1, c + d[0])); m.sel = m.rows[r][c]; draw(); }
        return true;
      };
      m.onEnter = function () { sh.emit(K.projLines(P[m.sel]), true); };
      m.stop = function () { box.removeAttribute("aria-live"); box.lastChild.remove(); };
      sh.mode = m; draw(); sh.scroll.scrollTop = sh.scroll.scrollHeight; return null;
    } });
  /* last: newest dated record. Only real dates from js/data.js (project "date" field or content "date"). */
  K.register({ name: "last", group: "projects", help: "latest dated record",
    man: { synopsis: "last", description: "Most recent dated entry from projects and posts. Dates come only from js/data.js; none recorded prints no records." },
    run: function () {
      var recs = P.filter(function (p) { return p.date; }).map(function (p) { return [p.date, "project", p.name]; });
      K.node("/blog") && Object.keys(K.node("/blog").kids).forEach(function (k) { var c = K.node("/blog").kids[k]; if (c.meta && c.meta.date) recs.push([c.meta.date, "post", c.meta.title || k]); });
      if (!recs.length) return [L(T("last: no records", "d"))];
      recs.sort(function (a, b) { return a[0] < b[0] ? 1 : -1; });
      return recs.slice(0, 5).map(function (r) { return L(T(r[0] + "  ", "d"), T(pad(r[1], 9), "d"), T(r[2], "h")); });
    } });
  /* hidden: warp <project> — ring transition, then the open confirmation */
  K.register({ name: "warp", hidden: true, group: "projects", help: "", complete: names,
    run: function (a, sh) {
      var p = K.findProject(a[0]); if (!p) return [L(T(a[0] ? "err: warp: unknown project: " + a[0] : "usage: warp <project>"))];
      sh.endMode();
      var pre = D.createElement("pre"); sh.out.appendChild(pre);
      var F = ["        ·        ", "      ( · )      ", "    (  ( · )  )  ", "  (  (  ( · )  )  )", "    (  ( · )  )  ", "      ( · )      ", "        ·        "], i = 0;
      function step() {
        pre.textContent = "warp: " + p.name + "\n" + F[i];
        if (++i < F.length) setTimeout(step, K.RM ? 0 : 120); else { pre.textContent = "warp: " + p.name + " · threshold crossed"; sh.confirm(p); }
      }
      step(); return null;
    } });
})(window.KX);
