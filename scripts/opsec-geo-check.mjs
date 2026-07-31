#!/usr/bin/env node
/**
 * Fails if named municipalities appear in product/source paths.
 * Geographic agnosticism / OPSEC gate for open-source LPINv3.
 *
 * Denylist tokens are stored encoded so host sample scanners do not
 * treat this gate file as a product surface hit.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ROOTS = ["src", "public", "scripts"];
/** Tooling / lab snapshots that intentionally list denylist tokens for scrubbing. */
const SKIP = new Set([
  "package-lock.json",
  "opsec-geo-check.mjs",
  "opsec-portable-check.mjs",
  "opsec-secrets-check.mjs",
  "opsec-surface-check.mjs",
  "scrub-catalog-opsec.mjs",
  "project-catalog.lab.ts",
  "_list-catalog-cities.mjs",
]);

// base64 JSON array of regex source strings (municipality / hometown denylist)
const FORBIDDEN = JSON.parse(
  Buffer.from(
    "WyJcXGJtaWFtaVxcYiIsIlxcYmJyb3dhcmRcXGIiLCJcXGJ0YW1wYVxcYiIsIlxcYm9ybGFuZG9cXGIiLCJcXGJqYWNrc29udmlsbGVcXGIiLCJcXGJhdXN0aW5cXGIiLCJcXGJkZW52ZXJcXGIiLCJcXGJwaG9lbml4XFxiIiwiXFxic2VhdHRsZVxcYiIsIlxcYmNoaWNhZ29cXGIiLCJcXGJueWNcXGIiLCJuZXcgeW9yayBjaXR5Iiwicml2ZXJzaWRlIGZsYXRzIiwibWlhbWlkYWRlIiwidmVyb1xccypiZWFjaCIsImZvcnRcXHMqbGF1ZGVyZGFsZSIsImxvcyBhbmdlbGVzIiwic2FuIGZyYW5jaXNjbyIsImhvdXN0b24iLCJcXGJkYWxsYXNcXGIiLCJcXGJib3N0b25cXGIiLCJcXGJhdGxhbnRhXFxiIl0=",
    "base64",
  ).toString("utf8"),
).map((src) => new RegExp(src, "i"));

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP.has(name)) continue;
    if (name === "node_modules" || name === ".git" || name === ".vercel") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs|json|md|css)$/.test(name)) out.push(p);
  }
  return out;
}

const hits = [];
for (const root of ROOTS) {
  for (const file of walk(join(ROOT, root))) {
    const text = readFileSync(file, "utf8");
    for (const re of FORBIDDEN) {
      if (re.test(text)) {
        const lines = text.split(/\n/);
        lines.forEach((line, i) => {
          if (re.test(line)) hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
        });
      }
    }
  }
}

if (hits.length) {
  console.error("OPSEC geo check FAILED — named municipalities found:\n");
  for (const h of hits.slice(0, 50)) console.error(" ", h);
  if (hits.length > 50) console.error(`  … +${hits.length - 50} more`);
  process.exit(1);
}
console.log("OPSEC geo check passed — no forbidden municipality names in src/public/scripts.");
process.exit(0);
