/* tools: date calc echo + pipe filters grep head wc */
(function (K) {
  var L = K.L, T = K.T;
  K.register({ name: "date", group: "tools", help: "local and UTC date / time", run: function () { var d = new Date(); return [L(T("local  ", "d"), T(d.toLocaleString())), L(T("utc    ", "d"), T(d.toISOString().replace("T", " ").slice(0, 19)))]; } });
  /* safe arithmetic: hand-written recursive-descent parser, no eval */
  function evaluate(src) {
    var toks = src.match(/\d+(?:\.\d+)?|\.\d+|[-+*/%^()]|\S/g) || [], i = 0;
    function peek() { return toks[i]; } function eat(t) { if (toks[i] !== t) throw 0; i++; }
    function expr() { var v = term(); while (peek() === "+" || peek() === "-") { var o = toks[i++], r = term(); v = o === "+" ? v + r : v - r; } return v; }
    function term() { var v = unary(); while (peek() === "*" || peek() === "/" || peek() === "%") { var o = toks[i++], r = unary(); v = o === "*" ? v * r : o === "/" ? v / r : v % r; } return v; }
    function power() { var b = atom(); if (peek() === "^") { i++; return Math.pow(b, unary()); } return b; }
    function unary() { if (peek() === "-") { i++; return -unary(); } if (peek() === "+") { i++; return unary(); } return power(); }
    function atom() { var t = toks[i]; if (t === "(") { i++; var v = expr(); eat(")"); return v; } if (t !== undefined && /^(\d|\.\d)/.test(t)) { i++; return parseFloat(t); } throw 0; }
    if (toks.length > 200) throw 0;
    var v = expr(); if (i !== toks.length) throw 0; return v;
  }
  K.register({ name: "calc", group: "tools", help: "calc <expr> — arithmetic (+ - * / % ^ parentheses)",
    run: function (a) {
      var e = a.join(" "); if (!e) return [L(T("usage: calc <expression>"))];
      try { var v = evaluate(e); if (!isFinite(v)) throw 0; return [L(T(e + " = ", "d"), T(+v.toPrecision(12), "b"))]; } catch (x) { return [L(T("err: calc: invalid expression"))]; }
    } });
  K.register({ name: "echo", group: "tools", help: "echo <text> — print text", run: function (a) { return [L(T(a.join(" ")))]; } });
  K.register({ name: "grep", group: "tools", help: "… | grep <word> — keep matching lines", palette: false,
    run: function (a, sh, inp) { if (!a[0]) return [L(T("usage: … | grep <word>"))]; if (!inp) return [L(T("err: grep: no input · usage: cmd | grep <word>"))]; var q = a.join(" ").toLowerCase(); return inp.filter(function (l) { return K.txt(l).toLowerCase().indexOf(q) >= 0; }); } });
  K.register({ name: "head", group: "tools", help: "… | head [n] — first n lines", palette: false, run: function (a, sh, inp) { return (inp || []).slice(0, +a[0] || 5); } });
  K.register({ name: "wc", group: "tools", help: "… | wc — count lines", palette: false, run: function (a, sh, inp) { return [L(T(String((inp || []).length)), T(" lines", "d"))]; } });
})(window.KX);
