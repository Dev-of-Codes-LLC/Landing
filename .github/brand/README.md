# GitHub brand kit

Images and copy that carry the devofcodes.com design onto GitHub. Same tokens as `assets/site.css`: `#080A0F` base, cyan `#00C8FF`, amber `#F59E0B`, Syne for display, JetBrains Mono for the `D<` mark and labels, Literata for body text.

| File | Where it goes | How |
|---|---|---|
| `avatar.png` (1024×1024) | Organization avatar | Org settings → Profile → Profile picture → Upload |
| `org-profile/` | Images for the org profile | Loaded by absolute URL from this repo's `main` branch. Keep the file names and paths, or the profile's images break. |
| `social-landing.png` (1280×640) | Social preview of this repository | Repository settings → General → Social preview → Edit → Upload |
| `social-agent-toolkit.png` (1280×640) | Social preview of the `agent-toolkit` repository | Same path, in that repository's settings |
| `social-github.png` (1280×640) | Social preview of the `.github` repository, the card shown when someone links the org profile | Same path, in that repository's settings |
| `assets/og.png` (1200×630) | Link previews of devofcodes.com (Google, LinkedIn, X, Slack, iMessage) | Already referenced by `og:image` and `twitter:image` on every page |
| `workspace-logo.png` (320×132) | Google Workspace logo in the Gmail, Drive and Calendar header | Admin console → Account → Account settings → Personalization → Custom logo |
| `gmail-signature.html` | Gmail signature | Open it in a browser, copy the signature block, paste into Gmail → Settings → See all settings → General → Signature |
| `x-header.png` (1500×500) | X (Twitter) profile header; `avatar.png` is the profile photo | X → Profile → Edit profile. Text sits in the right two thirds, clear of the avatar and of phone cropping. |
| `assets/favicon.svg` | The site's favicon | Already linked from every page. The `D<` outlines come from JetBrains Mono ExtraBold; `favicon.ico` (16, 32, 48) is an export of it, and `assets/apple-touch-icon.png` is `avatar.png` at 180×180. |

The org profile's text lives in [`profile/README.md`](https://github.com/Dev-of-Codes-LLC/.github/blob/main/profile/README.md) in the `.github` repository; edit it there. Its project statuses repeat the ledger on the home page, so change both together.

## Regenerate

The templates in `src/` are plain HTML. Edit one, then:

```sh
npm i --no-save playwright && npx playwright install chromium
node .github/brand/render.mjs
```

A new repository's social preview is one more row in `IMAGES` in `render.mjs`, with its name, a one-sentence description and its stack.
