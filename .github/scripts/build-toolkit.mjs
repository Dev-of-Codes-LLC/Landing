#!/usr/bin/env node
// Builds the catalog parts of toolkit.html from agent-toolkit's docs/site.json,
// so the page and the toolkit repo cannot disagree. Node 18+, no dependencies.
//
//   node .github/scripts/build-toolkit.mjs [--source <url or path>] [--page toolkit.html] [--check] [--fail-soft]
//
// It rewrites only what sits between marker comments in the page:
//   <!-- toolkit:install -->  the install commands and what each one adds
//   <!-- toolkit:stats -->    the counts, as one sentence with the catalog's date
//   <!-- toolkit:rules -->    the five rules
//   <!-- toolkit:chips -->    the filter chips and their counts
//   <!-- toolkit:cards -->    one card per skill, agent and routine, then the patterns as a list
// each closed by the same name with a slash: <!-- /toolkit:cards -->.
//
// --check      write nothing; exit 1 if the page differs from the catalog.
// --fail-soft  if the catalog cannot be read or is invalid, warn and leave the
//              page as committed (exit 0). The deploy uses this, so a GitHub
//              outage never blocks a site release.

import { readFileSync, writeFileSync } from "node:fs";

const DEFAULT_SOURCE = "https://raw.githubusercontent.com/Dev-of-Codes-LLC/agent-toolkit/main/docs/site.json";
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const source = opt("--source", DEFAULT_SOURCE);
const pagePath = opt("--page", "toolkit.html");
const check = args.includes("--check");
const failSoft = args.includes("--fail-soft");

// Errors end the run through main() below, never process.exit(): exiting while
// a fetch is still closing crashes Node on Windows.
class GiveUp extends Error {}
function giveUp(message) {
  throw new GiveUp(message);
}

async function loadCatalog() {
  try {
    if (/^https?:/.test(source)) {
      const res = await fetch(source, { signal: AbortSignal.timeout(15000) });
      if (!res.ok) throw new Error(`HTTP ${res.status} from ${source}`);
      return await res.json();
    }
    return JSON.parse(readFileSync(source, "utf8"));
  } catch (err) {
    giveUp(`could not read ${source}: ${err.message}`);
  }
}

const KINDS = ["skill", "agent", "routine", "pattern"];
function validate(site) {
  if (site?.schema !== 1) return `unknown schema ${site?.schema}`;
  for (const key of ["repo", "branch", "install", "rules", "items"]) if (!site[key]) return `missing ${key}`;
  if (!Array.isArray(site.items) || site.items.length === 0) return "no items";
  for (const [i, it] of site.items.entries()) {
    if (!KINDS.includes(it.kind)) return `items[${i}]: bad kind ${it.kind}`;
    for (const f of ["name", "plugin", "path", "what"]) if (!it[f]) return `items[${i}]: missing ${f}`;
  }
  return null;
}

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const mono = (html) => html.replace(/\btoolkit\.json\b/g, '<span class="mono">toolkit.json</span>');
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const count = (site, kind) => site.items.filter((it) => it.kind === kind).length;
const url = (site, path) => `${site.repo}/tree/${site.branch}/${path.split("/").map(encodeURIComponent).join("/")}`;

// Each word of a command is a .w span that never breaks, so a command wraps only at its spaces, never
// at a hyphen inside a name. Copy reads the code's textContent, which the spans leave unchanged.
const words = (cmd) => cmd.split(" ").map((word) => `<span class="w">${esc(word)}</span>`).join(" ");

function install(site) {
  // What each install adds: the names of the skills and agents in that plugin.
  const added = (cmd) => {
    const plugin = (cmd.match(/install ([\w-]+)@/) || [])[1];
    if (!plugin) return `✓ marketplace <b>${esc(site.name)}</b> added`;
    const names = site.items.filter((it) => it.plugin === plugin).map((it) => it.name);
    return `✓ ${names.map(esc).join(" · ")}`;
  };
  return site.install
    .map((cmd, i) => {
      const n = i + 1;
      return [
        `        <div class="term-line"><span class="p" aria-hidden="true">❯</span><code id="cmd${n}">${words(cmd)}</code><button class="term-copy" data-copy="cmd${n}">Copy</button></div>`,
        `        <div class="term-out">${added(cmd)}</div>`,
      ].join("\n");
    })
    .join('\n        <div class="term-gap"></div>\n');
}

// "2026-10-24" -> "Oct 24, 2026", the date format the rest of the site uses
const day = (iso) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

function stats(site) {
  // One sentence, not a strip of big numbers: "7 skills, 1 read-only agent, 1 scheduled routine and
  // 6 written patterns, counted from the catalog on Oct 24, 2026." The page's own rule: every fact
  // has a date, so the counts carry the catalog's and link to the file they were read from.
  const nouns = { skill: ["skill", "skills"], agent: ["read-only agent", "read-only agents"],
    routine: ["scheduled routine", "scheduled routines"], pattern: ["written pattern", "written patterns"] };
  const parts = KINDS.filter((k) => count(site, k) > 0).map((k) => {
    const n = count(site, k);
    return `<b>${n}</b> ${nouns[k][n === 1 ? 0 : 1]}`;
  });
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(", ")} and ${parts.at(-1)}` : parts.join("");
  const catalog = `<a href="${esc(`${site.repo}/blob/${site.branch}/docs/site.json`)}" rel="noopener">catalog</a>`;
  const when = site.updated ? ` on ${esc(day(site.updated))}` : "";
  return `    <p class="tk-count">${list}, counted from the ${catalog}${when}.</p>`;
}

function rules(site) {
  return site.rules
    .map((r, i) => `      <div class="rule"><div class="i">${String(i + 1).padStart(2, "0")}</div><h3>${esc(r.title)}</h3><p>${esc(r.text).replace(/\.\.\./g, "…")}</p></div>`)
    .join("\n");
}

function chips(site) {
  const labels = { skill: "Skills", agent: "Agents", routine: "Routines", pattern: "Patterns" };
  const all = `        <button class="chip" data-filter="all" aria-pressed="true">All<span class="c">${site.items.length}</span></button>`;
  const rest = KINDS.filter((k) => count(site, k) > 0).map(
    (k) => `        <button class="chip" data-filter="${k}" aria-pressed="false">${labels[k]}<span class="c">${count(site, k)}</span></button>`,
  );
  return [all, ...rest].join("\n");
}

function cards(site) {
  const kindLabel = { skill: "Skill", agent: "Agent", routine: "Routine" };
  const linkText = { routine: "Recipe on GitHub →" };
  const boxed = site.items
    .filter((it) => it.kind !== "pattern")
    .map((it) => {
      const label = it.kind === "routine" ? it.schedule ?? "routines/" : it.kind === "pattern" ? "patterns/" : it.plugin;
      const lines = [
        `      <article class="card${it.featured ? " featured" : ""} fade-up" data-kind="${it.kind}">`,
        `        <div class="card-top"><span class="kind kind--${it.kind}">${kindLabel[it.kind]}</span><span class="plugin">${esc(label)}</span></div>`,
        `        <h3>${esc(it.name)}</h3>`,
        `        <p class="what">${mono(esc(it.what))}</p>`,
      ];
      if (it.tags?.length) lines.push(`        <div class="featured-extra">${it.tags.map((t) => `<span class="tag">${esc(t)}</span>`).join("")}</div>`);
      if (it.wont) lines.push(`        <p class="refuses"><b>Won't</b>${esc(lowerFirst(it.wont))}</p>`);
      lines.push(`        <a class="src" href="${esc(url(site, it.path))}" rel="noopener">${linkText[it.kind] ?? "Source on GitHub →"}</a>`);
      lines.push("      </article>");
      return lines.join("\n");
    });
  // Patterns are short prose with nothing to box: a list that spans the grid, one row each.
  const patterns = site.items.filter((it) => it.kind === "pattern");
  if (patterns.length) {
    const rows = patterns.map((it) =>
      [
        `          <li class="pattern" data-kind="pattern">`,
        `            <h4>${esc(it.name)}</h4>`,
        `            <p>${mono(esc(it.what))} <a class="src" href="${esc(url(site, it.path))}" rel="noopener">Read it →</a></p>`,
        `          </li>`,
      ].join("\n"),
    );
    boxed.push(
      [
        `      <section class="patterns fade-up" aria-labelledby="patterns-title">`,
        `        <h3 class="patterns-title" id="patterns-title">Patterns, written up</h3>`,
        `        <ul>`,
        ...rows,
        `        </ul>`,
        `      </section>`,
      ].join("\n"),
    );
  }
  return boxed.join("\n\n");
}

function fill(page, name, body) {
  const re = new RegExp(`(<!-- toolkit:${name} -->\\n)[\\s\\S]*?(\\n[ \\t]*<!-- /toolkit:${name} -->)`);
  if (!re.test(page)) giveUp(`${pagePath} has no <!-- toolkit:${name} --> ... <!-- /toolkit:${name} --> markers`);
  return page.replace(re, (_, open, close) => `${open}${body}${close}`);
}

async function main() {
  const site = await loadCatalog();
  const problem = validate(site);
  if (problem) giveUp(`${source} is not a valid catalog: ${problem}`);

  const before = readFileSync(pagePath, "utf8");
  let page = before;
  page = fill(page, "install", install(site));
  page = fill(page, "stats", stats(site));
  page = fill(page, "rules", rules(site));
  page = fill(page, "chips", chips(site));
  page = fill(page, "cards", cards(site));

  if (check) {
    if (page !== before) {
      console.error(`build-toolkit: ${pagePath} is out of date with ${source}. Run: node .github/scripts/build-toolkit.mjs`);
      process.exitCode = 1;
      return;
    }
    console.log(`${pagePath} matches the catalog (${site.items.length} items, updated ${site.updated ?? "?"})`);
  } else {
    writeFileSync(pagePath, page);
    console.log(`${pagePath}: ${page === before ? "already up to date" : "rebuilt"} from ${source} (${site.items.length} items, updated ${site.updated ?? "?"})`);
  }
}

main().catch((err) => {
  if (!(err instanceof GiveUp)) throw err;
  if (failSoft) {
    // GitHub Actions shows ::warning:: lines on the run summary.
    console.log(`::warning::toolkit page not rebuilt, the committed cards are kept: ${err.message}`);
    return;
  }
  console.error(`build-toolkit: ${err.message}`);
  process.exitCode = 1;
});
