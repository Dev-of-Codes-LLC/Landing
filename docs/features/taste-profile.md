# Taste profile page

`taste.html` shows who shaped the work of DevOfCodes, credited by name, and whose taste it watches, in two lists that stay apart.

| | |
|---|---|
| Status | In review as of 2026-11-14 |
| Area | `taste.html`, `data/taste-profile.json` |
| Delivered in | Landing#68 |
| Related | [Tastebuds](https://github.com/Dev-of-Codes-LLC/tastebuds), the app and the file format |

## At a glance

- The page is built from one file, `data/taste-profile.json`, on every deploy. The page and the file cannot disagree.
- It shows 6 inspirations and 3 taste references.
- An inspiration says what it gave and where it is credited. A taste reference says neither.
- To change the page, change the file. Do not edit the cards in `taste.html` by hand.
- This guide is Markdown only. An HTML copy in this repository would be published with the site.

## Why it exists

The founding notes say to be open about inspirations. The page does that in public, and it keeps the one rule that matters: taste that is only watched is never shown as an influence. The profile is a file in the Tastebuds format, so DevOfCodes is the first to use Tastebuds for its own profile.

## How it works

Edit the profile, build the page, and open a pull request.

1. Edit `data/taste-profile.json`. The [format guide](https://github.com/Dev-of-Codes-LLC/tastebuds/blob/main/docs/features/profile-format.md) lists every field.
2. Run `node .github/scripts/build-taste.mjs`. It rewrites the blocks between the `taste:` marker comments in `taste.html`.
3. Commit both files. The pull request check fails if the page does not match the file.

The Tastebuds app can open and save the same file, if you prefer a form.

### What the build writes

| Marker | What goes there |
|---|---|
| `taste:jsonld` | The schema.org data: the page, one list for each relation, and the crediting work |
| `taste:stats` | The count line under the heading |
| `taste:inspirations` | One card for each inspiration: name, kind, what it gave, where it is credited, links |
| `taste:references` | One card for each taste reference: name, kind, notes, links |

### Add an entry

```json
{
  "id": "example-person",
  "name": "Example Person",
  "kind": "person",
  "relation": "tasteReference",
  "sameAs": ["https://example.com/"],
  "notes": "One line on what you see in their work.",
  "added": "2026-11-14"
}
```

*Illustrative example, not real data.*

To move an entry to the inspirations, change `relation` to `inspiration` and add `gave` and `creditedIn`. Do this only when a piece of work credits it.

## What it guarantees

- The page matches the file. `build-taste.mjs --check` runs on every pull request, and the build runs on every deploy.
- A taste reference never shows as an influence. The build refuses a taste reference that has `gave` or `creditedIn`.
- Every inspiration says what it gave and names the work that credits it. The build refuses one that does not.
- Text from the file cannot add markup to the page. The build escapes every value.
- The file is valid in the Tastebuds format. It passed `npm run validate` in a Tastebuds checkout on 2026-11-14.

## What it does not do

- It does not show the Harvard reading from the founding goals. Its exact title and a link to it are not confirmed, and the format needs a link.
- It does not name the concepts that each inspiration fed. Every inspiration is credited in "the DevOfCodes founding goals", which is not public.
- It does not use tags, a graph or a weighted profile. The display is a wall of cards.
- It does not format notes. A note is shown as plain text.
- It does not run the full Tastebuds schema in this repository. The build checks the rules the page depends on, with no dependencies.
- It embeds nothing and copies nothing. It links out.

> **Important:** The page names real people. It says "Not affiliated with or endorsed by them", and it must keep saying so.

## When something goes wrong

| What you see | What to do |
|---|---|
| The check fails with "taste.html does not match data/taste-profile.json" | Run `node .github/scripts/build-taste.mjs` and commit `taste.html` |
| "a taste reference cannot say what it gave or be credited" | Remove `gave` and `creditedIn`, or change `relation` to `inspiration` |
| "an inspiration must name the work that credits it" | Add `creditedIn`. If no work credits it, keep it a taste reference |
| "needs one or more http(s) links" | Add a link to `sameAs` |
| The deploy stops at "Build the taste page" | The profile on `main` is not valid. Fix the file; the message names the entry |

## Verification

| Check | Outcome |
|---|---|
| `build-taste.mjs --check`, `check-css.mjs`, `build-log.mjs --check` | pass |
| The profile against the Tastebuds schema | pass |
| The page in a browser at desktop and phone width, no sideways scroll | pass |
| All 10 outbound links answer | pass |
| The schema.org data in a validator such as the Rich Results Test | not checked |
| Screen reader, Firefox, Safari | not checked |

## Technical appendix

| File | What it is |
|---|---|
| `data/taste-profile.json` | The profile. It is also served at `/data/taste-profile.json` |
| `taste.html` | The page, with its marker blocks |
| `.github/scripts/build-taste.mjs` | The build and the check. Node 18 or newer, no dependencies |
| `.github/workflows/deploy.yml` | Runs the build before the upload |
| `.github/workflows/check.yml` | Runs the check on every pull request |

Each card has the id `taste-<entry id>`, and the schema.org data uses the same ids under `https://devofcodes.com/taste.html#`.
