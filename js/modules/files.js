/* files: ls cd pwd cat tree */
(function (K) {
  var L = K.L, T = K.T, pad = K.pad;
  function dirs(sh, cur, onlyDirs) {
    var base = cur.lastIndexOf("/") >= 0 ? cur.slice(0, cur.lastIndexOf("/") + 1) : "", n = K.node(K.norm(sh.cwd, base || "."));
    return n && n.type === "dir" ? Object.keys(n.kids).filter(function (k) { return !onlyDirs || n.kids[k].type === "dir"; }).map(function (k) { return base + k + (n.kids[k].type === "dir" ? "/" : ""); }) : [];
  }
  function last(sh) { var v = sh.input.value.split(" "); return v[v.length - 1]; }
  K.register({ name: "ls", group: "files", aliases: ["ll"], help: "ls [dir] — list a directory", complete: function (sh) { return dirs(sh, last(sh)); },
    run: function (a, sh) {
      var long = a[0] === "-l" || a[0] === "-la"; if (long) a = a.slice(1);
      var p = K.norm(sh.cwd, a[0] || "."), n = K.node(p);
      if (!n) return [L(T("err: ls: no such path: " + (a[0] || p)))];
      if (n.type === "file") return [L(T(a[0]))];
      if (!Object.keys(n.kids).length) return [L(T("(empty)", "d"))];
      if (long) return Object.keys(n.kids).sort().map(function (k) {
        var c = n.kids[k], kind, info;
        if (c.type === "dir") { kind = "dir "; info = "folder"; }
        else if (c.proj) { kind = "app "; info = c.proj.state + " · " + c.proj.klass; }
        else if (c.meta) { kind = "post"; info = (c.meta.date || "") + " " + (c.meta.title || ""); }
        else { kind = "file"; info = "text"; }
        return L(T(kind + "  ", "d"), T(pad(k + (c.type === "dir" ? "/" : ""), 22), c.type === "dir" ? "b" : c.proj ? "h" : ""), T(info, "d"));
      });
      return Object.keys(n.kids).sort(function (x, y) { return (n.kids[y].type === "dir") - (n.kids[x].type === "dir") || (x < y ? -1 : 1); }).map(function (k) {
        var c = n.kids[k]; if (c.type === "dir") return L(T(k + "/", "b"));
        if (c.meta) return L(T(K.pad(k, 28)), T(c.meta.date || "", "d"), T(c.meta.title ? "  " + c.meta.title : "", "d"));
        if (c.proj) return L(T(pad(k, 19)), T(pad(c.proj.klass, 24), "d"), T(c.proj.state, c.proj.state === "LIVE" ? "h" : "d"));
        return L(T(k));
      });
    } });
  K.register({ name: "cd", group: "files", help: "cd <dir> — change directory (.., /, ~)", complete: function (sh) { return dirs(sh, last(sh), true); },
    run: function (a, sh) { var p = K.norm(sh.cwd, a[0] || "/"), n = K.node(p); if (!n) return [L(T("err: cd: no such path: " + a[0]))]; if (n.type !== "dir") return [L(T("err: cd: not a directory: " + a[0]))]; sh.cwd = p; sh.paintPrompt(); return []; } });
  K.register({ name: "pwd", group: "files", help: "print working directory", run: function (a, sh) { return [L(T(sh.cwd))]; } });
  K.register({ name: "cat", group: "files", aliases: ["read"], help: "cat <file> — print a file (alias: read)", complete: function (sh) { return dirs(sh, last(sh)); },
    run: function (a, sh, inp) {
      if (!a[0]) return inp || [L(T("usage: cat <file>"))];
      var n = K.node(K.norm(sh.cwd, a[0]));
      if (!n) { var pr = K.findProject(a[0]); if (pr) n = K.node("/projects/" + pr.name); }
      if (!n) return [L(T("err: cat: no such file: " + a[0]))]; if (n.type === "dir") return [L(T("err: cat: is a directory: " + a[0]))];
      return n.read();
    } });
  K.register({ name: "tree", group: "files", help: "tree [dir] — directory tree", complete: function (sh) { return dirs(sh, last(sh), true); },
    run: function (a, sh) {
      var p = K.norm(sh.cwd, a[0] || "."), n = K.node(p); if (!n || n.type !== "dir") return [L(T("err: tree: not a directory: " + (a[0] || p)))];
      var out = [L(T(p, "b"))], files = 0, nd = 0;
      (function walk(d, pre) {
        var ks = Object.keys(d.kids);
        ks.forEach(function (k, i) {
          var c = d.kids[k], end = i === ks.length - 1;
          out.push(L(T(pre + (end ? "└── " : "├── "), "d"), T(k + (c.type === "dir" ? "/" : ""), c.type === "dir" ? "b" : "")));
          if (c.type === "dir") { nd++; walk(c, pre + (end ? "    " : "│   ")); } else files++;
        });
      })(n, "");
      return out;
    } });
})(window.KX);
