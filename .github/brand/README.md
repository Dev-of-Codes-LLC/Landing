# GitHub brand kit

Images and copy that carry the devofcodes.com design onto GitHub. Same tokens as `assets/site.css`: `#080A0F` base, cyan `#00C8FF`, amber `#F59E0B`, Syne for display, JetBrains Mono for the `D<` mark and labels, Literata for body text.

| File | Where it goes | How |
|---|---|---|
| `avatar.png` (1024×1024) | Organization avatar | Org settings → Profile → Profile picture → Upload |
| `org-profile/` | Images for the org profile | Loaded by absolute URL from this repo's `main` branch. Keep the file names and paths, or the profile's images break. |
| `social-landing.png` (1280×640) | Social preview of this repository | Repository settings → General → Social preview → Edit → Upload |
| `assets/favicon.svg` | The site's favicon | Already linked from every page. The `D<` outlines come from JetBrains Mono ExtraBold; `favicon.ico` (16, 32, 48) is an export of it, and `assets/apple-touch-icon.png` is `avatar.png` at 180×180. |

The org profile's text lives in [`profile/README.md`](https://github.com/Dev-of-Codes-LLC/.github/blob/main/profile/README.md) in the `.github` repository; edit it there. Its project statuses repeat the ledger on the home page, so change both together.

## Regenerate

The templates in `src/` are plain HTML. Edit one, then:

```sh
npm i --no-save playwright && npx playwright install chromium
node .github/brand/render.mjs
```

A new repository's social preview is one more row in `IMAGES` in `render.mjs`, with its name, a one-sentence description and its stack.
