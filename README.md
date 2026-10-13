# kxz0tn

Spaceship! | Cross-universe travel

A keyboard-only command terminal. Live: https://kxz0tn.github.io

## run

```
python -m http.server
```

## use

`help` `man` · `ls` `cd` `pwd` `cat`/`read` `tree` · `projects` `open` `map` `nav` · `date` `calc` `echo` · `… | grep` `head` `wc` ·
`history` `alias` `theme` `clear` `reboot` · `tab` `split` `close`

Keys: Tab / → accept suggestion · ↑↓ history · Ctrl+K palette · Ctrl+L clear · Alt+T tab · Alt+S split · Alt+O pane · Alt+W close · Alt+1..9 switch

No libraries. Black, white and grey only.

## layout

```
index.html            shell markup + script order
css/term.css          themes (dark / light), terminal styles
js/data.js            ALL editable content: me, projects, sections, content, fs
js/core.js            kernel: filesystem, sessions, tabs/panes, palette, keys, register()
js/modules/*.js       one file per module (files, projects, nav, tools, shell)
content/blog/         long-form posts (.md / .txt), empty for now
404.html              not-found page
```

## add a command / module

1. Create `js/modules/hello.js`:

```js
(function (K) {
  K.register({
    name: "hello", group: "tools", help: "hello [name] — say hello",
    run: function (args, sh, input) { return [K.L(K.T("hello " + (args[0] || "world"), "b"))]; }
  });
})(window.KX);
```

2. Add `<script src="js/modules/hello.js" defer></script>` to `index.html` after the other modules.

`run` returns lines (each line = list of `K.T(text, shade)`; shades: `""` normal, `"h"` bright, `"b"` bold, `"d"` dim), so output works with pipes (`hello | grep x`).
Return `null` to print nothing; return a Promise for async output. Optional: `complete(sh)` → suggestion list, `aliases: []`, `hidden: true`, `palette: false`, `paletteItems()`.
Interactive views set `sh.mode = { type, onKey(e, sh), onEnter(sh), stop(sh), timer }` — see `js/modules/projects.js` (map).

## add a folder or text file

In `js/data.js` → `fs`: `"/notes/": []` makes a folder, `"/notes/todo.txt": ["# title", "key  value", "plain line"]` makes a file.

## add a blog post (or notes, logs, any section)

1. Drop the file in `content/blog/my-post.md` (markdown-ish: `# title`, `- list`, `> quote`, ``` code fences).
2. Add one line to `content` in `js/data.js`:

```js
{ path: "/blog/my-post.md", src: "content/blog/my-post.md", title: "my post", date: "2026-10-20" },
```

It then shows in `ls /blog` and opens with `cat` or `read`. A new section = add `"/notes/"` to `sections` and a `content/notes/` folder.
Posts are fetched, so serve over http (GitHub Pages or `python -m http.server`), not `file://`.

## add a project

Add one entry to `projects` in `js/data.js`. It appears in `projects`, `/projects`, `open`, `map` and the palette.

## projects

- [zortex](https://kxz0tn.github.io/Zortex/)
- [hyperspace-portal](https://kxz0tn.github.io/Hyperspace-portal/)
- [cipher](https://github.com/kxz0tn/Cipher)
- [xenocoil](https://github.com/kxz0tn/Xenocoil)
- [void-runner](https://kxz0tn.github.io/void-runner/)
- [basebreaker](https://kxz0tn.github.io/basebreaker/)
- [neural-forge](https://kxz0tn.github.io/neural-forge/)
- [aetheris](https://kxz0tn.github.io/aetheris/)
- [high-trace](https://kxz0tn.github.io/high-trace/)
- [last-circuit](https://kxz0tn.github.io/last-circuit/)
- [dock-terminal](https://kxz0tn.github.io/dock-terminal/)

## license

MIT. Copyright (c) 2026 kxz0tn

## view-only by design

- The filesystem, data and command registry are deep-frozen at startup; `rm`, `mkdir`, `touch`, `mv`, `>` etc. answer `err: read-only filesystem`.
- No `eval` / `Function`: `calc` uses a small hand-written parser.
- All output is written with `textContent` (user input is never parsed as HTML).
- Strict Content-Security-Policy (`default-src 'self'`, no inline scripts or styles, `form-action 'none'`).
- Network: only this site's own static files (blog posts). Storage: theme and aliases in localStorage (aliases cannot override built-ins), plus a sessionStorage flag so the boot plays once per session.
