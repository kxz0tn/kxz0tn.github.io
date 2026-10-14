/* kxz0tn terminal — kernel: filesystem, registry, shell, keys, boot. Content lives in js/data.js, commands in js/modules/*.js */
(function () {
  "use strict";
  var D = document, $ = function (id) { return D.getElementById(id); };
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BOOT_KEY = "kxz0tn.boot";

  /* ---------- helpers ---------- */
  function pad(s, n) { s = String(s); return s + " ".repeat(Math.max(0, n - s.length)); }
  function z(n) { return (n < 10 ? "0" : "") + n; }
  function L() { return Array.prototype.slice.call(arguments); }   /* a line = list of [text, shade] */
  function T(t, c) { return [String(t), c || ""]; }
  function txt(line) { return line.map(function (s) { return s[0]; }).join(""); }
  var COLS = 60;  /* design grid; css scales the font so the same grid fits every screen */
  function utc(d) { return (d || new Date()).toISOString().slice(11, 19); }

  /* ---------- data + virtual filesystem ---------- */
  var DATA = window.KX_DATA || {}, ME = DATA.me || {};
  var PROJECTS = (DATA.projects || []).map(function (p, i) { return { i: i, name: p.name, klass: p.class, state: p.state, url: p.url, date: p.date || "" }; });
  var booting = true;
  function textFile(lines) { return { type: "file", read: function () { return lines.map(function (s) {
    if (/^# /.test(s)) return L(T(s.slice(2), "b"));
    var m = s.match(/^(\S+\s{2,})(.*)$/); return m ? L(T(m[1], "d"), T(m[2])) : L(T(s)); }); } }; }
  function projLines(p) { return [L(T(p.name, "b")), L(T("class  ", "d"), T(p.klass)), L(T("state  ", "d"), T(p.state)), L(T("url    ", "d"), T(p.url.replace("https://", "")))]; }
  var FS = { type: "dir", kids: {} };
  function mkdirp(abs) { var n = FS; abs.split("/").filter(Boolean).forEach(function (x) { n.kids[x] = n.kids[x] || { type: "dir", kids: {} }; n = n.kids[x]; }); return n; }
  function addFile(abs, obj) { var parts = abs.split("/").filter(Boolean), name = parts.pop(); mkdirp(parts.join("/")).kids[name] = obj; }
  Object.keys(DATA.fs || {}).forEach(function (path) { if (/\/$/.test(path)) mkdirp(path); else addFile(path, textFile(DATA.fs[path])); });
  /* each project is a folder: /projects/<name>/readme  (cd into it, then: open .) */
  mkdirp("/projects"); PROJECTS.forEach(function (p) { var d = mkdirp("/projects/" + p.name); d.proj = p; d.kids.readme = { type: "file", read: function () { return projLines(p); } }; });
  function md(text) {
    var code = false;
    return String(text).replace(/\r/g, "").split("\n").map(function (l) {
      if (/^```/.test(l)) { code = !code; return L(T("", "")); }
      if (code) return L(T("  " + l, "h"));
      if (/^#{1,3} /.test(l)) return L(T(l.replace(/^#+ /, ""), "b"));
      if (/^> /.test(l)) return L(T("│ ", "d"), T(l.slice(2), "d"));
      if (/^[-*] /.test(l)) return L(T("  · ", "d"), T(l.slice(2)));
      return L(T(l.replace(/\*\*|__|`/g, "")));
    });
  }
  (DATA.sections || []).forEach(function (d) { mkdirp(d); });
  (DATA.content || []).forEach(function (e) {
    addFile(e.path, { type: "file", meta: e, read: function () {
      var head = [L(T(e.title || e.path.split("/").pop(), "b"))].concat(e.date ? [L(T(e.date, "d"))] : []).concat([[]]);
      return fetch(e.src).then(function (r) { if (!r.ok) throw 0; return r.text(); }).then(function (t) { return head.concat(md(t)); })
        .catch(function () { return [L(T("err: cannot load: " + e.src))]; });
    } });
  });
  function norm(cwd, path) {
    var parts = (path && path[0] === "/" ? path : cwd + "/" + (path || "")).replace(/^~/, "").split("/"), st = [];
    parts.forEach(function (x) { if (!x || x === ".") return; if (x === "..") st.pop(); else st.push(x); });
    return "/" + st.join("/");
  }
  function node(abs) { var n = FS; abs.split("/").filter(Boolean).forEach(function (x) { n = n && n.type === "dir" ? n.kids[x] : null; }); return n || null; }
  function findProject(q) {
    q = String(q || "").toLowerCase().replace(/\/+$/, "").replace(/^.*\//, "");
    if (/^\d+$/.test(q)) return PROJECTS[+q - 1] || null;
    var m = PROJECTS.filter(function (p) { return p.name === q; }); if (m.length) return m[0];
    m = PROJECTS.filter(function (p) { return p.name.indexOf(q) === 0; }); return m.length === 1 ? m[0] : null;
  }

  /* ---------- command registry: KX.register({ name, group, help, man, run, complete, hidden }) ---------- */
  var REG = {}, GROUPS = [], FROZEN = false;
  function register(def) {
    if (!def || !def.name || typeof def.run !== "function") throw new Error("register: need name and run");
    if (FROZEN) throw new Error("register: modules must load before start");
    def.group = def.group || "other"; REG[def.name] = def; if (!def.hidden && GROUPS.indexOf(def.group) < 0) GROUPS.push(def.group);
  }
  function cmdNames() { return Object.keys(REG).filter(function (k) { return !REG[k].hidden; }); }

  /* ---------- shell ---------- */
  var sh = { cwd: "/", hist: [], hi: 0, mode: null, miss: 0 };
  sh.out = $("out"); sh.scroll = $("scroll"); sh.input = $("in"); sh.form = $("line"); sh.ps = $("ps");
  sh.paintPrompt = function () {
    var short = sh.cwd === "/" ? "~" : sh.cwd; sh.ps.textContent = "";
    var a = D.createElement("span"); a.textContent = ME.handle; var b = D.createElement("span"); b.className = "h"; b.textContent = short;
    var g = D.createElement("span"); g.className = "pg-gl"; g.textContent = ">";
    if (sh.mode && sh.mode.type === "search") { a.textContent = "search"; b.textContent = "history"; }
    sh.ps.appendChild(a); sh.ps.appendChild(D.createTextNode(" ")); sh.ps.appendChild(b); sh.ps.appendChild(D.createTextNode(" ")); sh.ps.appendChild(g);
    $("bcwd").textContent = sh.cwd;
  };
  sh.paint = function () {
    var v = sh.input.value; $("typed").textContent = v;
    var m = sh.mode && sh.mode.type === "search" ? sh.mode : null;
    $("aux").textContent = m ? (m.hit ? "   " + m.hit : (v ? "   no match" : "")) : "";
    if (v !== sh._last) { sh._last = v; var g = sh.ps.querySelector(".pg-gl"); if (g) { g.classList.add("typing"); clearTimeout(sh._tt); sh._tt = setTimeout(function () { g.classList.remove("typing"); }, 500); } }
  };
  sh.emit = function (lines, typed) {
    var frag = D.createDocumentFragment();
    lines.forEach(function (l, k) {
      var d = D.createElement("div");
      l.forEach(function (seg) { if (!seg[0]) return; var sp = D.createElement("span"); if (seg[1]) sp.className = seg[1]; sp.textContent = seg[0]; d.appendChild(sp); });
      if (typed && !RM) { d.className = "rv"; d.style.animationDelay = Math.min(k * 18, 360) + "ms"; }
      frag.appendChild(d);
    });
    sh.out.appendChild(frag); sh.scroll.scrollTop = sh.scroll.scrollHeight;
  };
  sh.typeLines = function (lines, after) { lines.forEach(function (l, k) { setTimeout(function () { sh.emit([l], true); if (k === lines.length - 1 && after) after(); }, RM ? 0 : k * 240); }); };
  sh.echo = function (raw) { var short = sh.cwd === "/" ? "~" : sh.cwd; sh.emit([L(T(ME.handle, "d"), T(" " + short + " ", "d"), T("> ", "d"), T(raw, "h"))]); };
  sh.endMode = function () { var m = sh.mode; sh.mode = null; if (m && m.timer) clearInterval(m.timer); if (m && m.stop) m.stop(); sh.paintPrompt(); };
  sh.confirm = function (p) {
    sh.emit(projLines(p).concat([[], L(T("exec: open " + p.url.replace("https://", "") + " ", "h"), T("[Y/n]", "d"))]), true);
    sh.mode = { type: "confirm", p: p };
  };
  sh.exec = function (raw) {
    if (/(^|\s)>>?\s*\S/.test(raw)) { sh.emit([L(T("err: read-only filesystem", "d"))]); return; }
    var stages = raw.split("|").map(function (x) { return x.trim(); }).filter(Boolean);
    (function step(k, data) {
      for (; k < stages.length; k++) {
        var a = stages[k].split(/\s+/), c = a.shift().toLowerCase();
        if (!REG[c]) { sh.miss++; var msg = [L(T("err: command not found: ", "d"), T(c, "h"))];
          if (sh.miss >= 2) msg.push(L(T("hint: ", "d"), T("help", "h")));
          sh.emit(msg, true); return; }
        sh.miss = 0;
        data = REG[c].run(a, sh, k ? data : undefined);
        if (data === null) return;
        if (data && typeof data.then === "function") { var nk = k + 1; data.then(function (d) { step(nk, d); }); return; }
      }
      if (data && data.length) sh.emit(data, true);
    })(0, undefined);
  };
  sh.run = function (v) { sh.endMode(); sh.echo(v); v = v.trim(); if (!v) return; sh.hist.push(v); sh.hi = sh.hist.length; sh.exec(v); };
  sh.submit = function () {
    var v = sh.input.value; sh.input.value = ""; sh.paint();
    var m = sh.mode;
    if (m && m.type === "confirm") {
      var y = /^(|y|yes)$/i.test(v.trim()); sh.mode = null; sh.echo(y ? "y" : "n");
      if (!y) return sh.emit([L(T("abort: launch", "d"))]);
      sh.emit([L(T("exec: open " + m.p.url, "d"))]); if (!window.open(m.p.url, "_blank", "noopener")) sh.emit([L(T("err: popup blocked by browser", "d"))]); return;
    }
    if (m && m.type === "search") { var hit = m.hit; sh.endMode(); if (hit) sh.run(hit); return; }
    if (m && m.onEnter && !v.trim()) { sh.endMode(); m.onEnter(); return; }
    sh.run(v);
  };

  /* Tab completion: only on explicit Tab */
  function complete() {
    var v = sh.input.value, parts = v.split(" "), cur = parts[parts.length - 1], pool;
    if (parts.length === 1) pool = cmdNames();
    else {
      var c = parts[0];
      if (REG[c] && REG[c].complete) pool = REG[c].complete(sh, cur);
      else return;
    }
    if (!cur && parts.length === 1) return;
    var m = pool.filter(function (x) { return x.indexOf(cur) === 0 && x !== cur; });
    if (m.length === 1) { parts[parts.length - 1] = m[0] + (parts.length === 1 ? " " : ""); sh.input.value = parts.join(" "); }
    else if (m.length > 1) { var pre = m.reduce(function (a, b) { var i = 0; while (i < a.length && a[i] === b[i]) i++; return a.slice(0, i); }); if (pre.length > cur.length) { parts[parts.length - 1] = pre; sh.input.value = parts.join(" "); } else { sh.echo(v); sh.emit([L(T(m.join("   "), "d"))]); } }
    sh.paint();
  }
  function pathPool(dirsOnly) { return function (s, cur) {
    var base = cur.lastIndexOf("/") >= 0 ? cur.slice(0, cur.lastIndexOf("/") + 1) : "", n = node(norm(s.cwd, base || "."));
    return n && n.type === "dir" ? Object.keys(n.kids).filter(function (k) { return !dirsOnly || n.kids[k].type === "dir"; }).map(function (k) { return base + k + (n.kids[k].type === "dir" ? "/" : ""); }) : [];
  }; }

  /* Ctrl+R reverse history search */
  function searchStart() { sh.endMode(); sh.mode = { type: "search", hit: "" }; sh.input.value = ""; sh.paintPrompt(); sh.paint(); }
  function searchUpdate() { var q = sh.input.value; sh.mode.hit = q ? (sh.hist.slice().reverse().filter(function (h) { return h.indexOf(q) >= 0; })[0] || "") : ""; }

  /* ---------- keys ---------- */
  sh.form.addEventListener("submit", function (e) { e.preventDefault(); sh.submit(); });
  sh.input.addEventListener("input", function () { if (sh.mode && sh.mode.type === "search") searchUpdate(); sh.paint(); });
  sh.input.addEventListener("focus", function () { D.body.classList.remove("blur"); });
  sh.input.addEventListener("blur", function () { D.body.classList.add("blur"); });
  D.addEventListener("keydown", function (e) {
    if (booting) return;
    var k = e.key.toLowerCase();
    if (D.activeElement !== sh.input) sh.input.focus({ preventScroll: true });
    if (sh.mode && sh.mode.onKey && !sh.input.value && sh.mode.onKey(e)) { e.preventDefault(); return; }
    if (e.ctrlKey && k === "r") { e.preventDefault(); return searchStart(); }
    if (k === "escape" && sh.mode) {
      e.preventDefault(); var t = sh.mode.type;
      if (t === "confirm") { sh.mode = null; sh.echo("n"); sh.emit([L(T("abort: launch", "d"))]); }
      else if (t === "search") { sh.input.value = ""; sh.endMode(); sh.paint(); }
      else { sh.endMode(); sh.emit([L(T("exit: " + t, "d"))]); }
      return;
    }
    if (sh.mode && sh.mode.anyKeyExits && e.key.length === 1) sh.endMode();
    if (k === "tab") { e.preventDefault(); if (!sh.mode) complete(); return; }
    if (k === "arrowup" && sh.hist.length && !sh.mode) { e.preventDefault(); sh.hi = Math.max(0, sh.hi - 1); sh.input.value = sh.hist[sh.hi]; return sh.paint(); }
    if (k === "arrowdown" && sh.hist.length && !sh.mode) { e.preventDefault(); sh.hi = Math.min(sh.hist.length, sh.hi + 1); sh.input.value = sh.hist[sh.hi] || ""; return sh.paint(); }
    if (e.ctrlKey && k === "l") { e.preventDefault(); sh.out.textContent = ""; return; }
    if (e.ctrlKey && k === "c") { if (!getSelection().toString()) { e.preventDefault(); sh.endMode(); sh.echo(sh.input.value + "^C"); sh.input.value = ""; sh.paint(); } return; }
  });
  D.addEventListener("mouseup", function () { if (!getSelection().toString()) sh.input.focus({ preventScroll: true }); });
  function tick() { $("clk").textContent = utc(); } tick(); setInterval(tick, 1000);

  /* ---------- boot: power-on lines, signal acquired; faint flicker once ---------- */
  function runBoot(done) {
    var bt = $("boot"), mark = bt.querySelector(".mk"), log = bt.querySelector(".lg"), bar = bt.querySelector(".pg");
    if (!RM) bt.classList.add("flick");
    var word = (ME.handle || "kxz0tn").toLowerCase(), t0 = performance.now(), DUR = 2750;
    mark.textContent = ""; var spans = word.split("").map(function (ch) { var sp = D.createElement("span"); sp.textContent = ch; sp.style.opacity = "0"; mark.appendChild(sp); return sp; });
    var at = spans.map(function (x, i) { return 80 + i * 70 + Math.random() * 160; });
    var STEPS = [["core", "online"], ["hull link", "stable"], ["ring sync", "aligned"], ["nav lattice", "calibrated"], ["terminal", "ready"]], LW = 22;
    var rows = STEPS.map(function (st, i) { var d = D.createElement("div"); d.innerHTML = "<span class='d'></span><span class='d'></span><span></span>"; d.style.opacity = "0"; log.appendChild(d); return { el: d, lab: st[0], st: st[1], at: 650 + i * 260 }; });
    function frame(now) {
      if (!booting) return;
      var t = now - t0;
      spans.forEach(function (sp, i) { var dt = t - at[i]; if (dt < 0) return; if (dt < 140) { sp.style.opacity = "0.5"; sp.textContent = "░"; } else { sp.style.opacity = "1"; sp.textContent = word[i]; } });
      rows.forEach(function (r) {
        var dt = t - r.at; if (dt < 0) return; r.el.style.opacity = "1";
        var dots = Math.min(LW - r.lab.length - 1, Math.floor(dt / 14));
        r.el.children[0].textContent = r.lab + " ";
        r.el.children[1].textContent = ".".repeat(Math.max(0, dots)) + " ".repeat(Math.max(0, LW - r.lab.length - 1 - dots));
        r.el.children[2].textContent = dt < 240 ? "  " + "·  ".slice(0, 1 + (Math.floor(dt / 80) % 3)) : " " + pad(r.st, 11) + "[ ok ]";
        r.el.children[2].className = dt < 240 ? "d" : "h";
      });
      var q = Math.min(1, Math.max(0, (t - 600) / 1500)), W = 36, f = Math.round(q * W);
      bar.textContent = t > 2150 ? "signal acquired" : "─".repeat(f) + "·".repeat(W - f);
      bar.className = "pg " + (t > 2150 ? "h sig" : "d");
      if (t < DUR) requestAnimationFrame(frame); else done();
    }
    requestAnimationFrame(frame);
  }

  window.KX = { register: register, REG: REG, GROUPS: GROUPS, cmdNames: cmdNames, L: L, T: T, pad: pad, z: z, txt: txt, COLS: COLS, utc: utc,
    ME: ME, PROJECTS: PROJECTS, FS: FS, norm: norm, node: node, findProject: findProject, projLines: projLines, pathPool: pathPool, md: md, sh: sh, RM: RM };

  D.addEventListener("DOMContentLoaded", function () {
    /* view-only: freeze data, filesystem and registry */
    (function freeze(o) { if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); Object.getOwnPropertyNames(o).forEach(function (k) { freeze(o[k]); }); } })({ d: DATA, fs: FS, p: PROJECTS });
    Object.freeze(REG); FROZEN = true;
    sh.paintPrompt();
    /* deep link: ?cmd=<command>  (one command, registered names only) */
    var cmd = ""; try { cmd = (new URLSearchParams(location.search).get("cmd") || "").slice(0, 120).replace(/[\u0000-\u001f]/g, ""); } catch (e) {}
    function welcome() { sh.emit([L(T(ME.handle, "b wm")), L(T(ME.bio, "d")), []], true); }
    function done() {
      if (!booting) return; booting = false;
      var bt = $("boot"); if (bt) { bt.classList.add("out"); setTimeout(function () { bt.remove(); }, RM ? 0 : 320); }
      sh.out.textContent = ""; welcome(); sh.form.style.visibility = "";
      try { sessionStorage.setItem(BOOT_KEY, "1"); } catch (e) {}
      sh.input.focus({ preventScroll: true }); sh.paint();
      if (cmd && REG[cmd.split(/\s+/)[0].toLowerCase()]) sh.run(cmd);
    }
    var seen = false; try { seen = sessionStorage.getItem(BOOT_KEY) === "1"; } catch (e) {}
    if (seen || RM || cmd || /[?&]noboot/.test(location.search)) { var b0 = $("boot"); if (b0) b0.remove(); done(); }
    else {
      sh.form.style.visibility = "hidden"; runBoot(done);
      ["keydown", "pointerdown"].forEach(function (ev) { addEventListener(ev, function f(e) { removeEventListener(ev, f, true); if (booting) { e.preventDefault(); done(); } }, true); });
    }
  });
})();
