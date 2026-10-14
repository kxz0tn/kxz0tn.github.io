/* tools: grep (pipe filter) */
(function (K) {
  var L = K.L, T = K.T;
  K.register({ name: "grep", group: "tools", help: "filter piped lines",
    man: { synopsis: "<cmd> | grep <word>", description: "Keep only the lines of the previous command that contain the word (case-insensitive)." },
    run: function (a, sh, inp) { if (!a[0]) return [L(T("usage: <cmd> | grep <word>"))]; if (!inp) return [L(T("err: grep: no input · usage: <cmd> | grep <word>"))]; var q = a.join(" ").toLowerCase(); return inp.filter(function (l) { return K.txt(l).toLowerCase().indexOf(q) >= 0; }); } });
})(window.KX);
