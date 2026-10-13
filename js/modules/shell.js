/* shell: help man whoami history alias unalias theme clear reboot tab split close + hidden jack-in */
(function (K) {
  var L = K.L, T = K.T, pad = K.pad;
  K.register({ name: "help", group: "shell", aliases: ["?"], help: "list commands",
    run: function () {
      var W = K.COLS - 13;
      function wrap(words, sep) { var lines = [""]; words.forEach(function (w) { var l = lines[lines.length - 1]; if (l && (l + sep + w).length > W) lines.push(w); else lines[lines.length - 1] = l ? l + sep + w : w; }); return lines; }
      var out = [L(T("commands", "b"), T("   man <cmd>", "d"))];
      K.GROUPS.forEach(function (g) {
        var cs = K.cmdNames().filter(function (c) { return K.REG[c].group === g; }); if (!cs.length) return;
        wrap(cs, " ").forEach(function (l, i) { out.push(L(T("  " + pad(i ? "" : g, 10), "d"), T(l, "h"))); });
      });
      out.push([]); out.push(L(T("keys", "b")));
      var keys = ["Tab / → accept suggestion", "↑ ↓ history", "Ctrl+K palette", "Ctrl+L clear", "Ctrl+C cancel", "Alt+T new tab", "Alt+S split", "Alt+O next pane", "Alt+W close", "Alt+1..9 switch tab"];
      wrap(keys, " · ").forEach(function (l) { out.push(L(T("  " + pad("", 10)), T(l, "d"))); });
      return out;
    } });
  K.register({ name: "man", group: "shell", help: "man <cmd> — manual for a command",
    run: function (a) { var r = K.REG[a[0]]; if (!a[0]) return [L(T("usage: man <command>"))]; if (!r || r.hidden && !r.aliasOf) return [L(T("err: no manual entry: " + a[0]))]; return [L(T((r.aliasOf || r.name).toUpperCase(), "b"), T("   " + r.group, "d")), L(T("  " + r.help))]; } });
  K.register({ name: "whoami", group: "shell", help: "identity", run: function () { return [L(T(K.ME.handle, "b sc")), L(T(K.ME.bio, "d"))]; } });
  K.register({ name: "sysinfo", group: "shell", help: "system information",
    run: function () {
      var logo = ["   .-~~~-.   ", " .'  .-.  '. ", "/   (   )   \\", "\\    '-'    /", " '.       .' ", "   '-...-'   "];
      var facts = [
        [K.ME.handle, "", "b"], ["", "", ""],
        ["bio", K.ME.bio], ["site", K.ME.site], ["x", K.ME.x], ["github", K.ME.github]];
      var out = [], n = Math.max(logo.length, facts.length);
      for (var i = 0; i < n; i++) { var f = facts[i], l = logo[i] || "             ";
        out.push(f ? (f[2] === "b" ? L(T(l + "   ", "h"), T(f[0], "b sc")) : L(T(l + "   ", "h"), T(f[0] ? pad(f[0], 10) : "", "d"), T(String(f[1])))) : L(T(l, "h"))); }
      return out;
    } });
  K.register({ name: "history", group: "shell", help: "command history", run: function (a, sh) { return sh.hist.map(function (h, k) { return L(T(pad(k + 1, 5), "d"), T(h)); }); } });
  K.register({ name: "alias", group: "shell", help: "alias [name=command] — list or define",
    run: function (a) {
      var s = a.join(" ");
      if (!s) { var ks = Object.keys(K.ALIAS); return ks.length ? ks.map(function (k) { return L(T(k, "h"), T(" = ", "d"), T(K.ALIAS[k])); }) : [L(T("alias: none", "d"))]; }
      var m = s.match(/^([\w-]+)=['"]?(.+?)['"]?$/); if (!m) return [L(T("usage: alias name=command"))];
      if (K.REG[m[1]]) return [L(T("err: alias: reserved name: " + m[1]))];
      if (m[2].length > 200 || Object.keys(K.ALIAS).length >= 50) return [L(T("err: alias: limit reached"))];
      K.ALIAS[m[1]] = m[2]; K.saveAlias(); return [L(T("ok: alias " + m[1] + "='" + m[2] + "'", "d"))];
    } });
  K.register({ name: "unalias", group: "shell", help: "unalias <name>", complete: function () { return Object.keys(K.ALIAS); },
    run: function (a) { if (!K.ALIAS[a[0]]) return [L(T("err: unalias: not found: " + (a[0] || "")))]; delete K.ALIAS[a[0]]; K.saveAlias(); return []; } });
  K.register({ name: "theme", group: "shell", help: "theme [dark|light] — switch theme", complete: function () { return ["dark", "light"]; },
    run: function (a) {
      var r = document.documentElement, t = a[0] === "dark" || a[0] === "light" ? a[0] : (r.dataset.theme === "light" ? "dark" : "light");
      r.dataset.theme = t; K.store("kx3-theme", t); document.querySelector('meta[name="theme-color"]').content = t === "light" ? "#f3f3f3" : "#0a0a0a";
      return [L(T("ok: theme=", "d"), T(t, "h"))];
    } });
  K.register({ name: "clear", group: "shell", help: "clear the pane (Ctrl+L)", run: function (a, sh) { sh.out.textContent = ""; return []; } });
  K.register({ name: "reboot", group: "shell", help: "restart", run: function () { try { sessionStorage.removeItem("kx3-boot"); } catch (e) {} setTimeout(function () { location.reload(); }, 150); return [L(T("sys: reboot", "d"))]; } });
  K.register({ name: "tab", group: "panes", help: "tab [n] — new tab, or switch to tab n (Alt+T, Alt+1..9)", run: function (a) { if (/^\d+$/.test(a[0] || "")) K.WM.go(+a[0] - 1); else K.WM.newTab(); return null; } });
  K.register({ name: "split", group: "panes", help: "split the current tab into two panes (Alt+S)", run: function () { K.WM.split(); return null; } });
  K.register({ name: "close", group: "panes", help: "close pane or tab (Alt+W)", run: function () { K.WM.close(); return null; } });
  K.register({ name: "jack-in", group: "hidden", hidden: true, help: "", palette: false,
    run: function (a, sh) { sh.typeLines([L(T("link: ring ........ aligned", "d")), L(T("link: threshold ... stable", "d")), L(T("link: cross-universe channel open", "b"))]); return null; } });
  /* read-only · this terminal is view-only; writing commands answer plainly */
  ["rm", "rmdir", "mkdir", "touch", "mv", "cp", "write", "edit", "nano", "vi", "vim", "chmod", "chown", "ln", "tee", "sudo"].forEach(function (n) {
    K.register({ name: n, group: "hidden", hidden: true, palette: false, help: "", run: function () { return [L(T("err: read-only filesystem", "d"))]; } });
  });
})(window.KX);
