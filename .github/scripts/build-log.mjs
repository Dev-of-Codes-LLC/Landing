#!/usr/bin/env node
// Copies log entries from changelog.html onto the home page, so the two cannot
// disagree. Node 18+, no dependencies.
//
//   node .github/scripts/build-log.mjs [--log changelog.html] [--page index.html] [--count 3] [--check]
//
// It rewrites two things in the page, and nothing else:
//   - what sits between <!-- log:latest --> and <!-- /log:latest -->: the newest
//     entries, one list item each, linked to changelog.html#<id>;
//   - every <a class="log-link" data-log-area="AREA">: the newest entry whose
//     area (the line under the date in .entry-when, such as "BBI") is AREA, as a
//     link with its title and date. The project records and the status board use
//     these for "Latest entry". An area with no entry stops the run.
//
// Every entry needs a unique id. The id is the entry's link, so it must never
// change. An entry without one stops the run (and the deploy) with its title.
//
// --check  write nothing; exit 1 if the page differs from the log.

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const logPath = opt("--log", "changelog.html");
const pagePath = opt("--page", "index.html");
const count = Number(opt("--count", "3"));
const check = args.includes("--check");

class GiveUp extends Error {}
function giveUp(message) {
  throw new GiveUp(message);
}

const text = (html) => html.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

function entries(log) {
  const found = [];
  const seen = new Set();
  for (const [block] of log.matchAll(/<article class="entry"[^>]*>[\s\S]*?<\/article>/g)) {
    const id = block.match(/^<article class="entry"[^>]*\bid="([^"]+)"/)?.[1];
    const when = block.match(/<div class="entry-when"><b>([^<]+)<\/b>([^<]*)<\/div>/);
    const h2 = block.match(/<h2>([\s\S]*?)<\/h2>/);
    if (!when || !h2) giveUp(`${logPath}: an entry has no date or no title:\n${block.slice(0, 200)}`);
    const title = text(h2[1].replace(/<span class="pill[^"]*">[\s\S]*?<\/span>/, ""));
    if (!id) giveUp(`${logPath}: the entry "${title}" has no id. Add id="<short-slug>" to its <article>.`);
    if (seen.has(id)) giveUp(`${logPath}: the id "${id}" is used twice.`);
    seen.add(id);
    found.push({ id, title, when: text(when[1]), area: text(when[2]) });
  }
  if (found.length === 0) giveUp(`${logPath} has no <article class="entry"> blocks`);
  return found;
}

// The newest entry per area: the log is newest first, so the first match wins.
function areaLinks(page, list) {
  return page.replace(/<a class="log-link" data-log-area="([^"]+)"[^>]*>[\s\S]*?<\/a>/g, (_, area) => {
    const e = list.find((x) => x.area === area);
    if (!e) giveUp(`${pagePath} links the newest "${area}" entry, but ${logPath} has no entry with that area.`);
    return `<a class="log-link" data-log-area="${area}" href="changelog.html#${e.id}">${e.title}<span class="when">${e.when}</span></a>`;
  });
}

function latest(list, indent) {
  const items = list.slice(0, count).map(
    (e) =>
      `${indent}  <li><a href="changelog.html#${e.id}">${e.title}</a><span class="when">${e.when}${e.area ? ` · ${e.area}` : ""}</span></li>`
  );
  return [`${indent}<ol class="ledger-latest">`, ...items, `${indent}</ol>`].join("\n");
}

// The region may be empty (a first run) and the file may use CRLF (a Windows checkout).
function fill(page, body) {
  const re = /<!-- log:latest -->(\r?\n)(?:[\s\S]*?\r?\n)?([ \t]*)<!-- \/log:latest -->/;
  const m = page.match(re);
  if (!m) giveUp(`${pagePath} has no <!-- log:latest --> ... <!-- /log:latest --> markers`);
  const [, nl, indent] = m;
  return page.replace(re, () => `<!-- log:latest -->${nl}${body(indent).replace(/\n/g, nl)}${nl}${indent}<!-- /log:latest -->`);
}

function main() {
  const list = entries(readFileSync(logPath, "utf8"));
  const before = readFileSync(pagePath, "utf8");
  const page = areaLinks(fill(before, (indent) => latest(list, indent)), list);

  if (check) {
    if (page !== before) {
      console.error(`build-log: ${pagePath} is out of date with ${logPath}. Run: node .github/scripts/build-log.mjs`);
      process.exitCode = 1;
      return;
    }
    console.log(`${pagePath} matches ${logPath} (newest: ${list[0].id})`);
  } else {
    writeFileSync(pagePath, page);
    console.log(`${pagePath}: ${page === before ? "already up to date" : "rebuilt"} from ${logPath} (newest ${Math.min(count, list.length)} of ${list.length}: ${list.slice(0, count).map((e) => e.id).join(", ")})`);
  }
}

try {
  main();
} catch (err) {
  if (!(err instanceof GiveUp)) throw err;
  console.error(`build-log: ${err.message}`);
  process.exitCode = 1;
}
