#!/usr/bin/env node
// Fails when a page's CSS has unbalanced braces. Node 18+, no dependencies.
//
//   node .github/scripts/check-css.mjs [file ...]
//
// With no arguments it checks every <style> block in the top-level *.html pages
// and every assets/*.css file. Comments and strings are skipped. A brace that
// closes nothing, or a block left open at the end, stops the run with its file
// and line.
//
// Why depth, not a count: in Landing#55 one block lost its closing brace and the
// same brace stayed behind earlier in the file. The counts matched, but the
// stray brace ended a rule early and the open @media block swallowed every rule
// after it, so the lower home page went unstyled on every screen above 480px.

import { readFileSync, readdirSync } from "node:fs";

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : [
      ...readdirSync(".").filter((f) => f.endsWith(".html")),
      ...readdirSync("assets").filter((f) => f.endsWith(".css")).map((f) => `assets/${f}`),
    ];

// The CSS of a file, with the line each part starts on: whole .css files, or each <style> block.
function sheets(file) {
  const text = readFileSync(file, "utf8");
  if (file.endsWith(".css")) return [{ css: text, line: 1 }];
  const found = [];
  for (const m of text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)) {
    found.push({ css: m[1], line: text.slice(0, m.index + m[0].indexOf(">") + 1).split("\n").length });
  }
  return found;
}

// First problem in one sheet, or null: a "}" at depth 0, or depth left above 0.
function problem(css) {
  let depth = 0, line = 0, opened = [];
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === "\n") line++;
    else if (c === "/" && css[i + 1] === "*") {
      const end = css.indexOf("*/", i + 2);
      const skip = end < 0 ? css.slice(i) : css.slice(i, end + 2);
      line += skip.split("\n").length - 1;
      i += skip.length - 1;
    } else if (c === '"' || c === "'") {
      let j = i + 1;
      while (j < css.length && css[j] !== c && css[j] !== "\n") j += css[j] === "\\" ? 2 : 1;
      i = j;
    } else if (c === "{") {
      depth++;
      opened.push(line);
    } else if (c === "}") {
      if (depth === 0) return { line, what: "a } that closes nothing" };
      depth--;
      opened.pop();
    }
  }
  return depth > 0 ? { line: opened[0], what: `a { that is never closed (${depth} open at the end)` } : null;
}

let failed = 0;
for (const file of files) {
  for (const sheet of sheets(file)) {
    const p = problem(sheet.css);
    if (p) {
      console.error(`check-css: ${file}:${sheet.line + p.line}: ${p.what}`);
      failed++;
    }
  }
}
if (failed) process.exitCode = 1;
else console.log(`check-css: ${files.length} files, braces balanced`);
