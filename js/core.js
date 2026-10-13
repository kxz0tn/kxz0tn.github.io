(function () {
  "use strict";
  var D = document, $ = function (id) { return D.getElementById(id); };
  var RM = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  var BOOT_T = Date.now();
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- helpers ---------- */
  function pad(s, n) { s = String(s); return s + " ".repeat(Math.max(0, n - s.length)); }
  function z(n) { return (n < 10 ? "0" : "") + n; }
  function L() { return Array.prototype.slice.call(arguments); }            // a line = list of [text, cls]
  function T(t, c) { return [String(t), c || ""]; }
  function txt(line) { return line.map(function (s) { return s[0]; }).join(""); }
  var COLS = 60; /* design grid in columns; css/term.css scales the font so it fits every screen */
  function utc(d) { return (d || new Date()).toISOString().slice(11, 19); }

  /* ---------- data + virtual filesystem (edit js/data.js) ---------- */
  var DATA = window.KX_DATA || {}, ME = DATA.me || {}, PROJECTS = (DATA.projects || []).map(function (p, i) { return { i: i, name: p.name, klass: p.class, state: p.state, url: p.url }; });
  var SESSION_LOG = [], booting = true;
  function textFile(lines) { return { type: "file", read: function () { return lines.map(function (s) {
    if (/^# /.test(s)) return L(T(s.slice(2), "b"));
    var m = s.match(/^(\S+\s{2,})(.*)$/); return m ? L(T(m[1], "d"), T(m[2])) : L(T(s)); }); } }; }
  function projFile(p) { return function () { return [L(T(p.name, "b")), L(T("class  ", "d"), T(p.klass)), L(T("state  ", "d"), T(p.state)), L(T("url    ", "d"), T(p.url.replace("https://", "")))]; }; }
  var FS = { type: "dir", kids: {} };
  function mkdirp(abs) { var n = FS; abs.split("/").filter(Boolean).forEach(function (x) { n.kids[x] = n.kids[x] || { type: "dir", kids: {} }; n = n.kids[x]; }); return n; }
  function addFile(abs, nodeObj) { var parts = abs.split("/").filter(Boolean), name = parts.pop(); mkdirp(parts.join("/")).kids[name] = nodeObj; }
  Object.keys(DATA.fs || {}).forEach(function (path) { if (/\/$/.test(path)) mkdirp(path); else addFile(path, textFile(DATA.fs[path])); });
  mkdirp("/projects"); PROJECTS.forEach(function (p) { addFile("/projects/" + p.name, { type: "file", proj: p, read: projFile(p) }); });
  /* content: markdown-ish files listed in DATA.content, loaded on demand */
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
  addFile("/logs/session.log", { type: "file", read: function () { return SESSION_LOG.length ? SESSION_LOG.map(function (e) { return L(T(e[0] + "  ", "d"), T(e[1])); }) : [L(T("(empty)", "d"))]; } });
  function norm(cwd, path) {
    var parts = (path && path[0] === "/" ? path : cwd + "/" + (path || "")).replace(/^~/, "").split("/"), st = [];
    parts.forEach(function (x) { if (!x || x === ".") return; if (x === "..") st.pop(); else st.push(x); });
    return "/" + st.join("/");
  }
  function node(abs) { var n = FS; abs.split("/").filter(Boolean).forEach(function (x) { n = n && n.type === "dir" ? n.kids[x] : null; }); return n || null; }
  function findProject(q) {
    q = String(q || "").toLowerCase().replace(/^.*\//, "");
    if (/^\d+$/.test(q)) return PROJECTS[+q - 1] || null;
    var m = PROJECTS.filter(function (p) { return p.name === q; }); if (m.length) return m[0];
    m = PROJECTS.filter(function (p) { return p.name.indexOf(q) === 0; }); return m.length === 1 ? m[0] : null;
  }

  /* ---------- aliases ---------- */
  var ALIAS = {}; try { ALIAS = JSON.parse(store("kx3-alias") || "{}") || {}; } catch (e) {}
  function saveAlias() { store("kx3-alias", JSON.stringify(ALIAS)); }

  /* ---------- command registry: KX.register({ name, help, group, run, complete, hidden, palette }) ---------- */
  var REG = {}, GROUPS = [], MODULES = [], K_FROZEN = false;
  function register(def) {
    if (!def || !def.name || typeof def.run !== "function") throw new Error("register: need name and run");
    if (K_FROZEN) throw new Error("register: modules must load before start");
    var src = D.currentScript && D.currentScript.src; if (src && MODULES.indexOf(src) < 0) MODULES.push(src);
    def.group = def.group || "other"; REG[def.name] = def; if (GROUPS.indexOf(def.group) < 0) GROUPS.push(def.group);
    (def.aliases || []).forEach(function (a) { REG[a] = Object.assign({}, def, { hidden: true, aliasOf: def.name }); });
  }
  function lev(a, b) { var m = [], i, j; for (i = 0; i <= a.length; i++) { m[i] = [i]; } for (j = 1; j <= b.length; j++) m[0][j] = j;
    for (i = 1; i <= a.length; i++) for (j = 1; j <= b.length; j++) m[i][j] = Math.min(m[i - 1][j] + 1, m[i][j - 1] + 1, m[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return m[a.length][b.length]; }
  function closest(c) { if (c.length < 2) return ""; var best = "", bd = 3; cmdNames().forEach(function (n) { var d = lev(c, n); if (d < bd && d <= (n.length > 4 ? 2 : 1)) { bd = d; best = n; } }); return best; }
  function cmdNames() { return Object.keys(REG).filter(function (k) { return !REG[k].hidden; }); }

  /* every occurrence of the handle renders in small caps: odd parts are the handle */
  function scSplit(t) { var h = (ME.handle || "").toLowerCase(); if (!h) return [t]; var out = [], low = t.toLowerCase(), i = 0, j;
    while ((j = low.indexOf(h, i)) >= 0) { out.push(t.slice(i, j), t.slice(j, j + h.length)); i = j + h.length; } out.push(t.slice(i)); return out; }
  /* ---------- session (one pane) ---------- */
  var SID = 0;
  function Session() {
    var s = this; s.id = ++SID; s.cwd = "/"; s.hist = []; s.hi = 0; s.mode = null;
    s.el = D.createElement("section"); s.el.className = "pane";
    s.el.innerHTML = '<div class="ph"></div><div class="scroll"><div class="out" role="log" aria-live="polite"></div>' +
      '<form class="line" autocomplete="off"><span class="ps"></span><span class="field"><span class="a"></span><span class="cur"> </span><span class="c"></span><span class="ghost"></span>' +
      '<input type="text" spellcheck="false" autocapitalize="off" autocorrect="off" enterkeyhint="go" aria-label="Command"></span></form></div>';
    s.ph = s.el.querySelector(".ph"); s.scroll = s.el.querySelector(".scroll"); s.out = s.el.querySelector(".out");
    s.form = s.el.querySelector("form"); s.input = s.el.querySelector("input"); s.ps = s.el.querySelector(".ps");
    s.fa = s.el.querySelector(".a"); s.fcur = s.el.querySelector(".cur"); s.fc = s.el.querySelector(".c"); s.fg = s.el.querySelector(".ghost");
    s.form.addEventListener("submit", function (e) { e.preventDefault(); s.submit(); });
    ["input", "keyup", "select"].forEach(function (ev) { s.input.addEventListener(ev, function () { s.paint(); }); });
    s.input.addEventListener("focus", function () { WM.activate(s); });
    s.paintPrompt();
  }
  Session.prototype.paintPrompt = function () {
    var short = this.cwd === "/" ? "~" : this.cwd;
    this.ps.innerHTML = ""; var a = D.createElement("span"); a.className = "sc"; a.textContent = ME.handle; var b = D.createElement("span"); b.className = "h"; b.textContent = short;
    var g = D.createElement("span"); g.className = "pg-gl"; g.textContent = ">";
    this.ps.appendChild(a); this.ps.appendChild(D.createTextNode(" ")); this.ps.appendChild(b); this.ps.appendChild(D.createTextNode(" ")); this.ps.appendChild(g);
    this.ph.textContent = this.cwd; if (WM.cur === this) $("bcwd").textContent = this.cwd; WM.paintTabs && WM.paintTabs();
  };
  Session.prototype.suggest = function () {
    var v = this.input.value; if (!v || /\s$/.test(v) && v.trim().split(/\s+/).length > 1) return "";
    var parts = v.split(" "), cur = parts[parts.length - 1], pool;
    if (parts.length === 1) { pool = cmdNames().concat(Object.keys(ALIAS)); var h = this.hist.slice().reverse().filter(function (x) { return x.indexOf(v) === 0 && x !== v; })[0]; if (h) return h.slice(v.length); }
    else {
      var c = parts[0];
      if (REG[c] && REG[c].complete) pool = REG[c].complete(this);
      else if (c === "man") pool = cmdNames();
      else if (/^(cd|ls|cat|tree)$/.test(c)) {
        var base = cur.lastIndexOf("/") >= 0 ? cur.slice(0, cur.lastIndexOf("/") + 1) : "", n = node(norm(this.cwd, base || "."));
        pool = n && n.type === "dir" ? Object.keys(n.kids).filter(function (k) { return c !== "cd" || n.kids[k].type === "dir"; }).map(function (k) { return base + k + (n.kids[k].type === "dir" ? "/" : ""); }) : [];
      } else return "";
    }
    if (!cur) return "";
    var m = pool.filter(function (x) { return x.indexOf(cur) === 0 && x !== cur; });
    return m.length ? m[0].slice(cur.length) : "";
  };
  Session.prototype.paint = function () {
    var v = this.input.value, i = this.input.selectionStart == null ? v.length : this.input.selectionStart;
    this.fa.textContent = v.slice(0, i); this.fcur.textContent = v.charAt(i) || " "; this.fc.textContent = v.slice(i + 1);
    this.ghostText = i === v.length ? this.suggest() : ""; this.fg.textContent = this.ghostText;
    if (v !== this._last) { this._last = v; var c = this.ps.querySelector(".pg-gl") || this.fcur; c.classList.add("typing"); clearTimeout(this._tt); this._tt = setTimeout(function () { c.classList.remove("typing"); }, 500); }
  };
  Session.prototype.accept = function () { if (this.ghostText) { this.input.value += this.ghostText; this.paint(); return true; } return false; };
  Session.prototype.emit = function (lines, typed) {
    var s = this, frag = D.createDocumentFragment();
    lines.forEach(function (l, k) {
      var d = D.createElement("div");
      l.forEach(function (seg) { scSplit(seg[0]).forEach(function (part, j) { if (!part) return; var sp = D.createElement("span"); var cls = (seg[1] || "") + (j % 2 ? " sc" : ""); if (cls.trim()) sp.className = cls.trim(); sp.textContent = part; d.appendChild(sp); }); });
      if (typed && !RM) { d.className = "rv"; d.style.animationDelay = Math.min(k * 18, 400) + "ms"; }
      frag.appendChild(d);
    });
    s.out.appendChild(frag); s.scroll.scrollTop = s.scroll.scrollHeight;
  };
  Session.prototype.typeLines = function (lines) { var s = this; lines.forEach(function (l, k) { setTimeout(function () { s.emit([l], true); }, RM ? 0 : k * 260); }); };
  Session.prototype.echo = function (raw) { var short = this.cwd === "/" ? "~" : this.cwd; this.emit([L(T(ME.handle, "d sc"), T(" " + short + " ", "d"), T("> ", "d"), T(raw, "h"))]); };
  Session.prototype.exec = function (raw) {
    var s = this, first = raw.split(/\s+/)[0];
    if (ALIAS[first]) raw = ALIAS[first] + raw.slice(first.length);
    if (/(^|\s)>>?\s*\S/.test(raw)) { s.emit([L(T("err: read-only filesystem", "d"))]); return; }
    var stages = raw.split("|").map(function (x) { return x.trim(); }).filter(Boolean);
    (function step(k, data) {
      for (; k < stages.length; k++) {
        var a = stages[k].split(/\s+/), c = a.shift().toLowerCase();
        if (!REG[c]) { s.miss = (s.miss || 0) + 1; var near = closest(c), msg = [L(T("err: command not found: ", "d"), T(c, "h"))];
          if (near) msg.push(L(T("did you mean: ", "d"), T(near, "h")));
          else if (s.miss >= 2) msg.push(L(T("hint: ", "d"), T("help", "h")));
          s.emit(msg, true); return; }
        s.miss = 0;
        data = REG[c].run(a, s, k ? data : undefined);
        if (data === null) return;
        if (data && typeof data.then === "function") { var nk = k + 1; data.then(function (d) { step(nk, d); }); return; }
      }
      if (data && data.length) s.emit(data, true);
    })(0, undefined);
  };
  Session.prototype.submit = function () {
    var s = this, v = s.input.value; s.input.value = ""; s.paint();
    if (s.mode && s.mode.type === "confirm") { var p = s.mode.p, y = /^(|y|yes)$/i.test(v.trim()); s.mode = null; s.echo(y ? "y" : "n"); if (!y) return s.emit([L(T("abort: launch", "d"))]); s.emit([L(T("exec: open " + p.url, "d"))]); if (!window.open(p.url, "_blank", "noopener")) s.emit([L(T("err: popup blocked by browser", "d"))]); return; }
    if (s.mode && s.mode.onEnter && !v.trim()) { var md = s.mode; s.endMode(); md.onEnter(s); return; }
    s.endMode(); s.echo(v); v = v.trim(); if (!v) return;
    s.hist.push(v); s.hi = s.hist.length; SESSION_LOG.push([utc(), v]); s.exec(v);
  };
  Session.prototype.endMode = function () { var m = this.mode; this.mode = null; if (m && m.timer) clearInterval(m.timer); if (m && m.stop) m.stop(this); };

  /* ---------- window manager: tabs + split panes ---------- */
  var WM = { tabs: [], t: 0, cur: null };
  WM.mount = function () {
    var host = $("panes"); host.textContent = "";
    var tab = WM.tabs[WM.t]; tab.forEach(function (s) { host.appendChild(s.el); });
    host.classList.toggle("single", tab.length === 1); $("tabs").hidden = WM.tabs.length === 1;
    WM.paintTabs(); if (tab.indexOf(WM.cur) < 0) WM.cur = tab[0]; WM.focus();
  };
  WM.paintTabs = function () {
    var el = $("tabs"); el.textContent = "";
    WM.tabs.forEach(function (tab, i) { var sp = D.createElement("span"); sp.className = i === WM.t ? "on" : ""; sp.textContent = (i === WM.t ? "▍" : " ") + (i + 1) + " " + (tab[0].cwd === "/" ? "~" : tab[0].cwd) + (tab.length > 1 ? " ⊞" : ""); el.appendChild(sp); });
  };
  WM.activate = function (s) { WM.cur = s; var tb = WM.tabs[WM.t]; $("bpos").textContent = WM.tabs.length > 1 || tb.length > 1 ? "tab " + (WM.t + 1) + " · pane " + (tb.indexOf(s) + 1) : ""; WM.tabs[WM.t].forEach(function (x) { x.el.classList.toggle("act", x === s); }); $("bcwd").textContent = s.cwd; };
  WM.focus = function () { if (!WM.cur) return; WM.activate(WM.cur); if ($("pal").hidden) WM.cur.input.focus({ preventScroll: true }); WM.cur.paint(); };
  WM.newTab = function () { var s = new Session(); WM.tabs.push([s]); WM.t = WM.tabs.length - 1; WM.cur = s; WM.mount(); s.emit([L(T("ok: tab " + WM.tabs.length + " opened", "d"))]); };
  WM.split = function () { var tab = WM.tabs[WM.t]; if (tab.length >= 2) { WM.cur.emit([L(T("err: split: pane limit reached", "d"))]); return; } var s = new Session(); s.cwd = WM.cur.cwd; s.paintPrompt(); tab.push(s); WM.cur = s; WM.mount(); s.emit([L(T("ok: pane opened", "d"))]); };
  WM.close = function () {
    var tab = WM.tabs[WM.t]; WM.cur.endMode();
    if (tab.length > 1) { tab.splice(tab.indexOf(WM.cur), 1); WM.cur = tab[0]; }
    else if (WM.tabs.length > 1) { WM.tabs.splice(WM.t, 1); WM.t = Math.max(0, WM.t - 1); WM.cur = WM.tabs[WM.t][0]; }
    else { WM.cur.emit([L(T("err: close: last pane", "d"))]); return; }
    WM.mount();
  };
  WM.go = function (i) { if (!WM.tabs[i]) return; WM.t = i; WM.cur = WM.tabs[i][0]; WM.mount(); };
  WM.nextPane = function () { var tab = WM.tabs[WM.t]; WM.cur = tab[(tab.indexOf(WM.cur) + 1) % tab.length]; WM.focus(); };

  /* ---------- palette ---------- */
  var PAL = { items: [], sel: 0 };
  function palItems() {
    var items = [];
    cmdNames().forEach(function (c) { var r = REG[c]; if (r.palette !== false) items.push({ label: c, hint: String(r.help || "").replace(/^[^—]*— /, ""), run: c }); if (r.paletteItems) items = items.concat(r.paletteItems()); });
    return items;
  }
  function palOpen() { $("pal").hidden = false; $("palin").value = ""; PAL.sel = 0; palDraw(); $("palin").focus(); }
  function palClose() { $("pal").hidden = true; WM.focus(); }
  function palDraw() {
    var q = $("palin").value.toLowerCase(); $("palq").textContent = $("palin").value;
    PAL.items = palItems().map(function (it) { var s = it.label, n = s.replace(/^open /, ""), j = 0; for (var k = 0; k < s.length && j < q.length; k++) if (s[k] === q[j]) j++;
      var score = !q ? 0 : s.indexOf(q) === 0 || n.indexOf(q) === 0 ? 0 : s.indexOf(q) >= 0 ? 1 : j === q.length ? 2 : 9; return { it: it, sc: score }; })
      .filter(function (x) { return x.sc < 9; }).sort(function (a, b) { return a.sc - b.sc; }).map(function (x) { return x.it; }).slice(0, 9);
    PAL.sel = Math.min(PAL.sel, Math.max(0, PAL.items.length - 1));
    var list = $("pallist"); list.textContent = "";
    PAL.items.forEach(function (it, i) { var d = D.createElement("div"); d.setAttribute("role", "option"); d.className = i === PAL.sel ? "on" : ""; d.innerHTML = "<span></span><span class='d'></span>"; d.firstChild.textContent = it.label; d.lastChild.textContent = it.hint; list.appendChild(d); });
    if (!PAL.items.length) { var e = D.createElement("div"); e.className = "d"; e.textContent = "no match"; list.appendChild(e); }
  }
  $("palin").addEventListener("input", function () { PAL.sel = 0; palDraw(); });
  $("palin").addEventListener("keydown", function (e) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); PAL.sel = (PAL.sel + (e.key === "ArrowDown" ? 1 : -1) + PAL.items.length) % Math.max(1, PAL.items.length); palDraw(); }
    else if (e.key === "Enter") { e.preventDefault(); var it = PAL.items[PAL.sel]; palClose(); if (it) { var s = WM.cur; s.endMode(); s.echo(it.run); s.hist.push(it.run); s.hi = s.hist.length; SESSION_LOG.push([utc(), it.run]); s.exec(it.run); } }
    else if (e.key === "Escape") { e.preventDefault(); palClose(); }
    e.stopPropagation();
  });

  /* ---------- global keys ---------- */
  D.addEventListener("keydown", function (e) {
    if (booting) return;
    var s = WM.cur; if (!s || !$("pal").hidden) return;
    var k = e.key.toLowerCase();
    if ((e.ctrlKey || e.metaKey) && k === "k") { e.preventDefault(); return palOpen(); }
    if (e.altKey && !e.ctrlKey) {
      if (k === "t") { e.preventDefault(); return WM.newTab(); }
      if (k === "s") { e.preventDefault(); return WM.split(); }
      if (k === "w") { e.preventDefault(); return WM.close(); }
      if (k === "o") { e.preventDefault(); return WM.nextPane(); }
      if (/^[1-9]$/.test(e.key) || /^Digit[1-9]$/.test(e.code)) { e.preventDefault(); return WM.go(+(e.code.slice(-1)) - 1); }
    }
    if (D.activeElement !== s.input) s.input.focus({ preventScroll: true });
    if (s.mode && s.mode.onKey && !s.input.value && s.mode.onKey(e, s)) { e.preventDefault(); return; }
    if (k === "escape" && s.mode) { e.preventDefault(); var t = s.mode.type; if (t === "confirm") { s.mode = null; s.echo("n"); s.emit([L(T("abort: launch", "d"))]); } else { s.endMode(); s.emit([L(T("exit: " + (t || "view"), "d"))]); } return; }
    if (s.mode && s.mode.anyKeyExits && e.key.length === 1) { s.endMode(); }
    if (k === "tab") { e.preventDefault(); return s.accept(); }
    if (k === "arrowright" && s.input.selectionStart === s.input.value.length && s.accept()) { e.preventDefault(); return; }
    if (k === "arrowup" && s.hist.length) { e.preventDefault(); s.hi = Math.max(0, s.hi - 1); s.input.value = s.hist[s.hi]; return setTimeout(function () { s.paint(); }); }
    if (k === "arrowdown" && s.hist.length) { e.preventDefault(); s.hi = Math.min(s.hist.length, s.hi + 1); s.input.value = s.hist[s.hi] || ""; return setTimeout(function () { s.paint(); }); }
    if (e.ctrlKey && k === "l") { e.preventDefault(); s.out.textContent = ""; return; }
    if (e.ctrlKey && k === "c") { if (!getSelection().toString()) { e.preventDefault(); s.endMode(); s.echo(s.input.value + "^C"); s.input.value = ""; s.paint(); } return; }
    setTimeout(function () { s.paint(); });
  });
  D.addEventListener("mouseup", function (e) {
    if (getSelection().toString()) return;
    var pane = e.target.closest && e.target.closest(".pane");
    if (!$("pal").hidden) { if (!e.target.closest(".pal-box")) palClose(); else $("palin").focus(); return; }
    WM.tabs[WM.t].forEach(function (s) { if (s.el === pane) WM.cur = s; }); WM.focus();
  });

  /* ---------- clock ---------- */
  function tick() { $("clk").textContent = utc(); } tick(); setInterval(tick, 1000);

  /* ---------- startup sequence: wordmark resolves, init lines (real facts only), progress ---------- */
  function runBoot(timers, done) {
    var bt = $("boot"), mark = bt.querySelector(".mk"), log = bt.querySelector(".lg"), bar = bt.querySelector(".pg");
    var word = (ME.handle || "kxz0tn").toLowerCase(), t0 = performance.now(), DUR = 2750;
    mark.textContent = ""; var spans = word.split("").map(function (ch) { var sp = D.createElement("span"); sp.textContent = ch; sp.style.opacity = "0"; mark.appendChild(sp); return sp; });
    var at = spans.map(function (x, i) { return 80 + i * 70 + Math.random() * 160; });
    /* power-on lines: label, leader dots fill in, then [ ok ]; no numbers, no stats */
    var STEPS = ["core", "hull link", "ring sync", "nav lattice", "terminal"], LW = 22, rows = [];
    var STATE = ["online", "stable", "aligned", "calibrated", "ready"];
    STEPS.forEach(function (lab, i) {
      var d = D.createElement("div"); d.innerHTML = "<span class='d'></span><span class='d'></span><span></span>"; d.style.opacity = "0"; log.appendChild(d);
      rows.push({ el: d, lab: lab, st: STATE[i], at: 650 + i * 260 });
    });
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

  /* ---------- boot (after all modules registered) ---------- */
  window.KX = { register: register, REG: REG, GROUPS: GROUPS, cmdNames: cmdNames, L: L, T: T, pad: pad, z: z, txt: txt, COLS: COLS, utc: utc, store: store,
    ME: ME, PROJECTS: PROJECTS, FS: FS, norm: norm, node: node, addFile: addFile, mkdirp: mkdirp, textFile: textFile, findProject: findProject,
    md: md, ALIAS: ALIAS, saveAlias: saveAlias, WM: WM, SESSION_LOG: SESSION_LOG, MODULES: MODULES, RM: RM, T0: BOOT_T, VERSION: "3.0" };
  D.addEventListener("DOMContentLoaded", function () {
  /* view-only: freeze data, filesystem and registry; drop stored aliases that shadow built-ins */
  (function freeze(o) { if (o && typeof o === "object" && !Object.isFrozen(o)) { Object.freeze(o); Object.getOwnPropertyNames(o).forEach(function (k) { freeze(o[k]); }); } })({ d: DATA, fs: FS, p: PROJECTS, me: ME });
  Object.keys(ALIAS).forEach(function (k) { if (REG[k] || typeof ALIAS[k] !== "string" || !/^[\w-]+$/.test(k) || ALIAS[k].length > 200) delete ALIAS[k]; }); saveAlias();
  Object.freeze(REG); K_FROZEN = true;
  var first = new Session(); WM.tabs.push([first]); WM.cur = first; WM.mount();
  booting = true; var timers = [];
  function welcome() {
    first.emit([L(T(ME.handle, "b sc")), L(T(ME.bio, "d")), []], true);
  }
  function done() {
    if (!booting) return; booting = false; timers.forEach(clearTimeout);
    var bt = $("boot"); if (bt) { bt.classList.add("out"); setTimeout(function () { bt.remove(); }, RM ? 0 : 320); }
    first.out.textContent = ""; welcome(); first.form.style.visibility = "";
    try { sessionStorage.setItem("kx3-boot", "1"); } catch (e) {} WM.focus();
  }
  var seen = false; try { seen = sessionStorage.getItem("kx3-boot") === "1"; } catch (e) {}
  if (seen || RM || /[?&]noboot/.test(location.search)) { var b0 = $("boot"); if (b0) b0.remove(); booting = true; done(); }
  else { first.form.style.visibility = "hidden"; runBoot(timers, done);
    ["keydown", "pointerdown"].forEach(function (ev) { addEventListener(ev, function f(e) { removeEventListener(ev, f, true); if (booting) { e.preventDefault(); done(); } }, true); }); }
  });
})();
