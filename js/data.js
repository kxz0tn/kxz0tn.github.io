/* kxz0tn terminal — editable data.
   me:       who the terminal belongs to
   projects: one entry per project; each becomes /projects/<name> and works with open / map
   sections: folders for long-form content (blog, notes, …). Empty is fine.
   content:  one line per post: { path, src, title, date }. src is a .md/.txt file in /content,
             loaded when someone runs cat / read. Markdown-ish: # title, - list, > quote, ``` code.
   fs:       extra files and folders. "path/" = folder, "path": [lines] = text file.
             Line formatting: "# title" = bold, "key  value" (2+ spaces) = dim key. */
window.KX_DATA = {
  me: {
    handle: "kxz0tn",
    bio: "Spaceship! | Cross-universe travel",
    site: "kxz0tn.github.io",
    x: "x.com/kxz0tn",
    github: "github.com/kxz0tn"
  },
  projects: [
    { name: "zortex", class: "inertial space survival", state: "LIVE", url: "https://kxz0tn.github.io/Zortex/" },
    { name: "hyperspace-portal", class: "wormhole control deck", state: "LIVE", url: "https://kxz0tn.github.io/Hyperspace-portal/" },
    { name: "cipher", class: "arena sport", state: "LIVE", url: "https://github.com/kxz0tn/Cipher" },
    { name: "xenocoil", class: "arcade core", state: "LIVE", url: "https://github.com/kxz0tn/Xenocoil" },
    { name: "void-runner", class: "lunar survival", state: "LIVE", url: "https://kxz0tn.github.io/void-runner/" },
    { name: "basebreaker", class: "endless runner", state: "LIVE", url: "https://kxz0tn.github.io/basebreaker/" },
    { name: "neural-forge", class: "electronics lab", state: "BETA", url: "https://kxz0tn.github.io/neural-forge/" },
    { name: "aetheris", class: "medical research", state: "BETA", url: "https://kxz0tn.github.io/aetheris/" },
    { name: "high-trace", class: "moon / ISS instrument", state: "LIVE", url: "https://kxz0tn.github.io/high-trace/" },
    { name: "last-circuit", class: "space lessons terminal", state: "LIVE", url: "https://kxz0tn.github.io/last-circuit/" },
    { name: "dock-terminal", class: "public command berth", state: "LIVE", url: "https://kxz0tn.github.io/dock-terminal/" }
  ],
  sections: ["/blog/"],
  content: [
    // { path: "/blog/hello.md", src: "content/blog/hello.md", title: "hello", date: "2026-10-14" }
  ],
  fs: {
    "/readme.txt": [
      "# kxz0tn terminal",
      "help      list commands",
      "ls / cd   move through folders",
      "cat       read a file",
      "Ctrl+K    command palette"
    ],
    "/about.txt": [
      "handle  kxz0tn",
      "bio     Spaceship! | Cross-universe travel",
      "site    kxz0tn.github.io"
    ],
    "/contact.txt": [
      "x       x.com/kxz0tn",
      "github  github.com/kxz0tn"
    ],
    "/logs/": []
  }
};
