#!/usr/bin/env node
// Builds the entries of taste.html from data/taste-profile.json, so the page
// and the profile cannot disagree. Node 18+, no dependencies.
//
//   node .github/scripts/build-taste.mjs [--profile data/taste-profile.json] [--page taste.html] [--check]
//
// The profile is a file in the format of Tastebuds, the open-source taste
// profile app: https://github.com/Dev-of-Codes-LLC/tastebuds
//
// It rewrites only what sits between marker comments in the page:
//   <!-- taste:jsonld -->        the schema.org data for the page
//   <!-- taste:stats -->         how many entries of each kind
//   <!-- taste:inspirations -->  one card for each inspiration
//   <!-- taste:references -->    one card for each taste reference
// each closed by the same name with a slash: <!-- /taste:references -->.
//
// --check  write nothing; exit 1 if the page differs from the profile.
//
// The two relations stay apart all the way through. A taste reference has no
// "gave" and no credit, here or in the data, and is never shown as an influence.

import { readFileSync, writeFileSync } from "node:fs";

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const profilePath = opt("--profile", "data/taste-profile.json");
const pagePath = opt("--page", "taste.html");
const check = args.includes("--check");

const PAGE_URL = "https://devofcodes.com/taste.html";
const OWNER_ID = "https://devofcodes.com/#organization";
const TYPES = { person: "Person", studio: "Organization", channel: "CreativeWork", book: "CreativeWork", work: "CreativeWork" };

function fail(message) {
  console.error(`build-taste: ${message}`);
  process.exitCode = 1;
}

// The rules of the Tastebuds format that this page depends on. The full check
// is the format's own: `npm run validate -- <file>` in a Tastebuds checkout.
function problemsOf(profile) {
  const problems = [];
  if (!/^1\.\d+$/.test(profile?.formatVersion ?? "")) problems.push("formatVersion must be 1.x");
  if (!["Person", "Organization"].includes(profile?.owner?.type)) problems.push("owner.type must be Person or Organization");
  if (!profile?.owner?.name) problems.push("owner.name is missing");
  if (!Array.isArray(profile?.entries)) return [...problems, "entries is missing"];
  const seen = new Set();
  const isLink = (u) => typeof u === "string" && /^https?:\/\/\S+$/.test(u);
  profile.entries.forEach((e, i) => {
    const at = `entries[${i}]${e?.id ? ` (${e.id})` : ""}`;
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e?.id ?? "")) problems.push(`${at}: bad id`);
    else if (seen.has(e.id)) problems.push(`${at}: id is used twice`);
    else seen.add(e.id);
    if (!e?.name?.trim()) problems.push(`${at}: name is missing`);
    if (!TYPES[e?.kind]) problems.push(`${at}: bad kind ${e?.kind}`);
    if (!Array.isArray(e?.sameAs) || e.sameAs.length === 0 || !e.sameAs.every(isLink)) problems.push(`${at}: needs one or more http(s) links`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(e?.added ?? "")) problems.push(`${at}: added must be YYYY-MM-DD`);
    if (e?.relation === "inspiration") {
      if (!e.gave?.trim()) problems.push(`${at}: an inspiration must say what it gave`);
      if (!Array.isArray(e.creditedIn) || e.creditedIn.length === 0 || !e.creditedIn.every((c) => c?.name?.trim() && (c.url === undefined || isLink(c.url))))
        problems.push(`${at}: an inspiration must name the work that credits it`);
    } else if (e?.relation === "tasteReference") {
      if ("gave" in e || "creditedIn" in e) problems.push(`${at}: a taste reference cannot say what it gave or be credited`);
    } else {
      problems.push(`${at}: bad relation ${e?.relation}`);
    }
  });
  return problems;
}

const esc = (text) =>
  String(text).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const host = (link) => new URL(link).hostname.replace(/^www\./, "");
const out = (href, text) => `<a href="${esc(href)}" rel="noopener">${esc(text)}</a>`;
const links = (entry) => `<p class="taste-links">${entry.sameAs.map((l) => out(l, host(l))).join(" ")}</p>`;

function card(entry) {
  const head = `<h3>${out(entry.sameAs[0], entry.name)} <span class="taste-kind">${esc(entry.kind)}</span></h3>`;
  const notes = entry.notes?.trim() ? `\n          <p class="taste-notes">${esc(entry.notes.trim())}</p>` : "";
  if (entry.relation === "inspiration") {
    const credits = entry.creditedIn.map((c) => (c.url ? out(c.url, c.name) : esc(c.name))).join("<br>");
    return `        <article class="taste-card" id="taste-${entry.id}">
          ${head}
          <dl><dt>Gave</dt><dd>${esc(entry.gave)}</dd><dt>Credited in</dt><dd>${credits}</dd></dl>${notes}
          ${links(entry)}
        </article>`;
  }
  return `        <article class="taste-card taste-card--watch" id="taste-${entry.id}">
          ${head}${notes}
          ${links(entry)}
        </article>`;
}

function jsonLd(profile, inspirations, references) {
  const entity = (e) => ({
    "@type": TYPES[e.kind],
    "@id": `${PAGE_URL}#taste-${e.id}`,
    name: e.name,
    url: e.sameAs[0],
    sameAs: e.sameAs,
  });
  const list = (id, name, description, entries) => ({
    "@type": "ItemList",
    "@id": `${PAGE_URL}#${id}`,
    name,
    description,
    numberOfItems: entries.length,
    itemListElement: entries.map((e, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: entity(e),
      ...(e.relation === "inspiration" ? { description: e.gave } : {}),
    })),
  });
  const works = new Map();
  for (const e of inspirations) {
    for (const c of e.creditedIn) {
      const key = `${c.name}\n${c.url ?? ""}`;
      if (!works.has(key)) works.set(key, { "@type": "CreativeWork", name: c.name, ...(c.url ? { url: c.url } : {}), creator: { "@id": OWNER_ID }, mentions: [] });
      works.get(key).mentions.push({ "@id": `${PAGE_URL}#taste-${e.id}` });
    }
  }
  const graph = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebPage",
        "@id": PAGE_URL,
        url: PAGE_URL,
        name: `The ${profile.owner.name} taste profile`,
        about: { "@id": OWNER_ID },
        isPartOf: { "@id": "https://devofcodes.com/#website" },
      },
      list("inspirations", "Inspirations", `People and work that gave something to the work of ${profile.owner.name}, credited by name.`, inspirations),
      list("taste-references", "Taste references", `People and work whose taste ${profile.owner.name} watches. Nothing was taken from them.`, references),
      ...works.values(),
    ],
  };
  // "<" is written as \u003c so no text in the data can close the script element.
  return `<script type="application/ld+json">\n${JSON.stringify(graph, null, 2).replace(/</g, "\\u003c")}\n</script>`;
}

function replaceBlock(page, name, body) {
  const open = `<!-- taste:${name} -->`;
  const close = `<!-- /taste:${name} -->`;
  const a = page.indexOf(open);
  const b = page.indexOf(close);
  if (a < 0 || b < a) throw new Error(`${pagePath} has no ${open} ... ${close} block`);
  return page.slice(0, a + open.length) + "\n" + body + "\n" + page.slice(page.lastIndexOf("\n", b) + 1);
}

function main() {
  let profile;
  try {
    profile = JSON.parse(readFileSync(profilePath, "utf8"));
  } catch (err) {
    return fail(`could not read ${profilePath}: ${err.message}`);
  }
  const problems = problemsOf(profile);
  if (problems.length > 0) return fail(`${profilePath} is not a valid profile:\n  ${problems.join("\n  ")}`);

  const inspirations = profile.entries.filter((e) => e.relation === "inspiration");
  const references = profile.entries.filter((e) => e.relation === "tasteReference");
  const count = (n, one, many) => `${n} ${n === 1 ? one : many}`;

  const before = readFileSync(pagePath, "utf8");
  let page = before;
  try {
    page = replaceBlock(page, "jsonld", jsonLd(profile, inspirations, references));
    page = replaceBlock(page, "stats", `      <p class="page-meta">${count(inspirations.length, "inspiration", "inspirations")} · ${count(references.length, "taste reference", "taste references")} · made with Tastebuds</p>`);
    page = replaceBlock(page, "inspirations", inspirations.map(card).join("\n"));
    page = replaceBlock(page, "references", references.map(card).join("\n"));
  } catch (err) {
    return fail(err.message);
  }

  if (check) {
    if (page !== before) return fail(`${pagePath} does not match ${profilePath}. Run: node .github/scripts/build-taste.mjs`);
    console.log(`${pagePath} matches ${profilePath} (${inspirations.length} inspirations, ${references.length} taste references)`);
    return;
  }
  if (page !== before) writeFileSync(pagePath, page);
  console.log(`${pagePath}: ${inspirations.length} inspirations, ${references.length} taste references${page === before ? " (no change)" : ""}`);
}

main();
