#!/usr/bin/env node
/**
 * Fails if named municipalities appear in product/source paths.
 * Geographic agnosticism / OPSEC gate for open-source LPIN Suite.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ROOTS = ["src", "public", "scripts"];
const SKIP = new Set(["package-lock.json", "opsec-geo-check.mjs"]);

// Real places / agencies tied to a city. State names (Florida, Texas) are allowed.
const FORBIDDEN = [
  /\bmiami\b/i,
  /\bbroward\b/i,
  /\btampa\b/i,
  /\borlando\b/i,
  /\bjacksonville\b/i,
  /\baustin\b/i,
  /\bdenver\b/i,
  /\bphoenix\b/i,
  /\bseattle\b/i,
  /\bchicago\b/i,
  /\bnyc\b/i,
  /new york city/i,
  /riverside flats/i,
  /miamidade/i,
  /vero\s*beach/i,
  /fort\s*lauderdale/i,
  /los angeles/i,
  /san francisco/i,
  /houston/i,
  /\bdallas\b/i,
  /\bboston\b/i,
  /\batlanta\b/i,
];

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
