# kxz0tn.github.io

Spaceship! | Cross-universe travel. A view-only, keyboard-only command terminal. Black and white only.

## Commands
| group | commands |
|---|---|
| files | `ls [-l]` `cd` `pwd` `read` `tree` |
| projects | `projects` `open <name>` / `open .` `map` `last` |
| views | `ring` |
| tools | `<cmd> \| grep <word>` |
| shell | `help` `?` `man <cmd>` `whoami` `sysinfo` `status` `history` `clear` |

Keys: Tab complete · ↑↓ history · Ctrl+R search history · Ctrl+L clear · Ctrl+C cancel · Esc leave view.

Deep links: `/?cmd=projects` or `/?cmd=man%20open` runs a registered command and skips the boot.

## Editing
- `js/data.js` holds identity, projects (`name`, `class`, `state`, `url`, optional `date`), text files, sections and content.
- Posts: put markdown in `content/blog/` (or `content/log/`) and add an entry to `content`, e.g.
  `{ path: "/blog/hello.md", src: "content/blog/hello.md", title: "hello", date: "2026-10-14" }`.
  `last` lists only dates recorded here.
- Commands: add a file in `js/modules/` that calls `KX.register({ name, group, help, man: { synopsis, description }, run, complete, hidden })`, then add a `<script defer>` line in `index.html`.

## Safety
Frozen data, no eval, text output only, strict CSP, no network outside this site. Write commands answer `err: read-only filesystem`.

MIT licensed.
