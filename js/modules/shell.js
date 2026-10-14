/* shell: help ? man whoami sysinfo status history clear + hidden jack-in, read-only guards */
(function (K) {
  var L = K.L, T = K.T, pad = K.pad;
  K.register({ name: "help", group: "shell", help: "command list",
    man: { synopsis: "help", description: "List commands by group. man <cmd> for details, ? for keys." },
    run: function () {
      var W = K.COLS - 13;
      function wrap(words) { var lines = [""]; words.forEach(function (w) { var l = lines[lines.length - 1]; if (l && (l + " " + w).length > W) lines.push(w); else lines[lines.length - 1] = l ? l + " " + w : w; }); return lines; }
      var out = [L(T("commands", "b"), T("   man <cmd> · ? keys", "d"))];
      K.GROUPS.forEach(function (g) {
        var cs = K.cmdNames().filter(function (c) { return K.REG[c].group === g; }); if (!cs.length) return;
        wrap(cs).forEach(function (l, i) { out.push(L(T("  " + pad(i ? "" : g, 10), "d"), T(l, "h"))); });
      });
      return out;
    } });
  K.register({ name: "?", group: "shell", help: "key table",
    man: { synopsis: "?", description: "Keyboard shortcuts." },
    run: function () {
      return [["enter", "run"], ["tab", "complete"], ["↑ ↓", "history"], ["ctrl+r", "search history"], ["ctrl+l", "clear"], ["ctrl+c", "cancel line"], ["esc", "leave view"]]
        .map(function (r) { return L(T("  " + pad(r[0], 10), "h"), T(r[1], "d")); });
    } });
  K.register({ name: "man", group: "shell", help: "manual page", complete: function () { return K.cmdNames(); },
    man: { synopsis: "man <cmd>", description: "Manual page for a command." },
    run: function (a) {
      if (!a[0]) return [L(T("usage: man <cmd>"))];
      var r = K.REG[a[0]]; if (!r || r.hidden) return [L(T("err: no manual entry: " + a[0]))];
      var m = r.man || { synopsis: r.name, description: r.help };
      return [L(T("NAME", "b")), L(T("    " + r.name + " — " + r.help)), [], L(T("SYNOPSIS", "b")), L(T("    " + m.synopsis, "h")), [], L(T("DESCRIPTION", "b")), L(T("    " + m.description))];
    } });
  K.register({ name: "whoami", group: "shell", help: "identity", man: { synopsis: "whoami", description: "Handle and bio." }, run: function () { return [L(T(K.ME.handle, "b wm")), L(T(K.ME.bio, "d"))]; } });
  K.register({ name: "sysinfo", group: "shell", help: "system profile",
    man: { synopsis: "sysinfo", description: "Profile card: handle, bio, site, links." },
    run: function () {
      var logo = ["   .-~~~-.   ", " .'  .-.  '. ", "/   (   )   \\", "\\    '-'    /", " '.       .' ", "   '-...-'   "];
      var facts = [[K.ME.handle, "", "b"], ["", "", ""], ["bio", K.ME.bio], ["site", K.ME.site], ["x", K.ME.x], ["github", K.ME.github]];
      var out = [], n = Math.max(logo.length, facts.length);
      for (var i = 0; i < n; i++) { var f = facts[i], l = logo[i] || "             ";
        out.push(f ? (f[2] === "b" ? L(T(l + "   ", "h"), T(f[0], "b wm")) : L(T(l + "   ", "h"), T(f[0] ? pad(f[0], 10) : "", "d"), T(String(f[1])))) : L(T(l, "h"))); }
      return out;
    } });
  K.register({ name: "status", group: "shell", help: "ship telemetry",
    man: { synopsis: "status", description: "Ship systems readout. Words only, no measurements." },
    run: function () {
      return [["core", "online"], ["hull", "sealed"], ["ring", "idle"], ["nav lattice", "locked"], ["link", "nominal"], ["terminal", "view-only"]]
        .map(function (r) { return L(T("  " + pad(r[0], 14), "d"), T("● ", "h"), T(r[1], "h")); });
    } });
  K.register({ name: "history", group: "shell", help: "command history", man: { synopsis: "history", description: "Commands entered this session. Ctrl+R searches them." },
    run: function (a, sh) { return sh.hist.map(function (h, k) { return L(T(pad(k + 1, 5), "d"), T(h)); }); } });
  K.register({ name: "clear", group: "shell", help: "clear screen", man: { synopsis: "clear", description: "Clear the screen (Ctrl+L)." }, run: function (a, sh) { sh.out.textContent = ""; return []; } });
  K.register({ name: "jack-in", group: "hidden", hidden: true, help: "",
    run: function (a, sh) { sh.typeLines([L(T("link: ring ........ aligned", "d")), L(T("link: threshold ... stable", "d")), L(T("link: cross-universe channel open", "b"))]); return null; } });
  /* read-only: writing commands answer plainly */
  ["rm", "rmdir", "mkdir", "touch", "mv", "cp", "write", "edit", "nano", "vi", "vim", "chmod", "chown", "ln", "tee", "sudo"].forEach(function (n) {
    K.register({ name: n, group: "hidden", hidden: true, help: "", run: function () { return [L(T("err: read-only filesystem", "d"))]; } });
  });
})(window.KX);
