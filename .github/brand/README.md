# GitHub brand kit

Images and copy that carry the devofcodes.com design onto GitHub. Same tokens as `assets/site.css`: `#080A0F` base, cyan `#00C8FF`, amber `#F59E0B`, Syne for display, JetBrains Mono for the `D<` mark and labels, Literata for body text.

| File | Where it goes | How |
|---|---|---|
| `avatar.png` (1024×1024) | Organization avatar | Org settings → Profile → Profile picture → Upload |
| `org-profile/` | `profile/` in the [`Dev-of-Codes-LLC/.github`](https://github.com/Dev-of-Codes-LLC/.github) repository | Copy the folder's six files into `profile/` on `main`. GitHub shows `profile/README.md` on the org page. |
| `social-landing.png` (1280×640) | Social preview of this repository | Repository settings → General → Social preview → Edit → Upload |

The org profile lives here because the `.github` repository holds nothing else yet; once it is copied over, `.github` is the copy to edit. The project statuses in `org-profile/README.md` repeat the ledger on the home page, so change both together.

## Regenerate

The templates in `src/` are plain HTML. Edit one, then:

```sh
npm i --no-save playwright && npx playwright install chromium
node .github/brand/render.mjs
```

A new repository's social preview is one more row in `IMAGES` in `render.mjs`, with its name, a one-sentence description and its stack.
