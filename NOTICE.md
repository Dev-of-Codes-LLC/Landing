# Notice

What in this repository is under which licence. Checked 2026-10-24.

## Code: MIT

The code is under the MIT licence in [`LICENSE.md`](LICENSE.md): the HTML structure, `assets/site.css`, `assets/site.js`, `assets/shaders.js`, `.claude/serve.json`, and everything under `.github/` (the deploy workflow, `build-toolkit.mjs`, and the templates that render the brand images). Copy it, change it, build your own site on it.

## Copy and images: © DevOfCodes LLC

The written copy on every page, the images under `assets/` and `.github/brand/`, and the DevOfCodes name and mark are © 2025–2026 DevOfCodes LLC, all rights reserved. They are not under the MIT licence. Quote them with attribution; do not reuse them as your own.

## Third-party pieces: their own licences

- The live backgrounds use the [`shaders`](https://github.com/shader-effects-inc/shaders) library (MIT). It is loaded from a CDN at runtime by `assets/shaders.js` and is not vendored here.
- `.claude/skills/transitions-dev/` and `.claude/skills/transitions-polish/` are the [transitions.dev](https://transitions.dev) agent skills by Jakub Antalik, copied at commit `a0c6e7b`. Each sits under its own `LICENSE.txt`, which allows using the transitions in your own site and forbids republishing the collection as a pack of its own. The deploy never uploads `.claude/`.
- The fonts are served by Google Fonts under their own licences.
- The projects described on the site belong to their respective owners, as each page says.
