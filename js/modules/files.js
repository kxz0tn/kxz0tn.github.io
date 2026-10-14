/* files: ls cd pwd tree read */
(function (K) {
  var L = K.L, T = K.T;
  function kids(n) { return Object.keys(n.kids).sort(function (x, y) { return (n.kids[y].type === "dir") - (n.kids[x].type === "dir") || (x < y ? -1 : 1); }); }
  K.register({ name: "ls", group: "files", help: "list a folder", complete: K.pathPool(false),
    man: { synopsis: "ls [-l] [path]", description: "List the contents of a folder. -l adds a type column." },
    run: function (a, sh) {
      var long = a[0] === "-l"; if (long) a = a.slice(1);
      var p = K.norm(sh.cwd, a[0] || "."), n = K.node(p);
      if (!n) return [L(T("err: ls: no such path: " + (a[0] || p)))];
      if (n.type === "file") return [L(T(a[0]))];
      var ks = kids(n); if (!ks.length) return [L(T("(empty)", "d"))];
      return ks.map(function (k) {
        var c = n.kids[k], dir = c.type === "dir", label = k + (dir ? "/" : "");
        if (!long) return L(T(label, dir ? "b" : ""));
        var kind = c.proj ? "proj" : dir ? "dir " : c.meta ? "post" : "file";
        return L(T(kind + "  ", "d"), T(label, dir ? "b" : ""));
      });
    } });
  K.register({ name: "cd", group: "files", help: "change folder", complete: K.pathPool(true),
    man: { synopsis: "cd [path]", description: "Change the working folder. Accepts /, ~, .. and relative paths." },
    run: function (a, sh) { var p = K.norm(sh.cwd, a[0] || "/"), n = K.node(p); if (!n) return [L(T("err: cd: no such path: " + a[0]))]; if (n.type !== "dir") return [L(T("err: cd: not a directory: " + a[0]))]; sh.cwd = p; sh.paintPrompt(); return []; } });
  K.register({ name: "pwd", group: "files", help: "working folder", man: { synopsis: "pwd", description: "Print the working folder." }, run: function (a, sh) { return [L(T(sh.cwd))]; } });
  K.register({ name: "read", group: "files", help: "print a file", complete: K.pathPool(false),
    man: { synopsis: "read <path>", description: "Print a file. A project name or folder prints its readme." },
    run: function (a, sh, inp) {
      if (!a[0]) return inp || [L(T("usage: read <path>"))];
      var n = K.node(K.norm(sh.cwd, a[0]));
      if (!n) { var pr = K.findProject(a[0]); if (pr) n = K.node("/projects/" + pr.name); }
      if (n && n.type === "dir" && n.kids.readme) n = n.kids.readme;
      if (!n) return [L(T("err: read: no such file: " + a[0]))]; if (n.type === "dir") return [L(T("err: read: is a directory: " + a[0]))];
      return n.read();
    } });
  K.register({ name: "tree", group: "files", help: "folder tree", complete: K.pathPool(true),
    man: { synopsis: "tree [path]", description: "Draw the folder tree below a path." },
    run: function (a, sh) {
      var p = K.norm(sh.cwd, a[0] || "."), n = K.node(p); if (!n || n.type !== "dir") return [L(T("err: tree: not a directory: " + (a[0] || p)))];
      var out = [L(T(p, "b"))];
      (function walk(d, pre) {
        var ks = kids(d);
        ks.forEach(function (k, i) {
          var c = d.kids[k], end = i === ks.length - 1;
          out.push(L(T(pre + (end ? "└── " : "├── "), "d"), T(k + (c.type === "dir" ? "/" : ""), c.type === "dir" ? "b" : "")));
          if (c.type === "dir" && !c.proj) walk(c, pre + (end ? "    " : "│   "));
        });
      })(n, "");
      return out;
    } });
})(window.KX);
