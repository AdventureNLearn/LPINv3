#!/usr/bin/env node
/**
 * Fail if operator skill chrome / banned public-surface tokens appear in product UI paths.
 * @see PUBLIC_SURFACE_CONTRACT.md
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ROOTS = ["src/components", "src/routes", "public"];
const ROOT_MD = ["README.md", "ORIGIN.md", "ACKNOWLEDGMENTS.md"];
// PUBLIC_SURFACE_CONTRACT.md intentionally lists banned tokens — not scanned.

// Skip denylist *implementations* (they must contain the patterns they strip).
const SKIP_FILES = new Set(["contract.ts", "opsec-surface-check.mjs"]);

// Tokens banned as product chrome in user-facing UI paths.
const BANNED = [
  /\bshatter-protocol\b/i,
  /\bmission-spine\b/i,
  /\bfrog protocol\b/i,
  /\bsovereign-lens\b/i,
  /\bevidence-gate\b/i,
  /🐸/,
  /\bSHATTER\b/,
];

function isAllowlistedDocLine(line) {
  return /do not|must not|banned|never|strip|not put/i.test(line);
}

const hits = [];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".git") continue;
    if (SKIP_FILES.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(ts|tsx|js|mjs|css|html|json)$/.test(name)) out.push(p);
  }
  return out;
}

for (const root of ROOTS) {
  for (const file of walk(join(ROOT, root))) {
    const text = readFileSync(file, "utf8");
    const lines = text.split(/\n/);
    lines.forEach((line, i) => {
      for (const re of BANNED) {
        if (re.test(line)) {
          hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
        }
      }
    });
  }
}

for (const rel of ROOT_MD) {
  try {
    const file = join(ROOT, rel);
    const lines = readFileSync(file, "utf8").split(/\n/);
    lines.forEach((line, i) => {
      if (isAllowlistedDocLine(line)) return;
      for (const re of BANNED) {
        if (re.test(line)) {
          hits.push(`${file}:${i + 1}: ${line.trim().slice(0, 120)}`);
        }
      }
    });
  } catch {
    /* optional */
  }
}

if (hits.length) {
  console.error("OPSEC surface check FAILED — banned operator chrome in product paths:\n");
  for (const h of hits.slice(0, 40)) console.error(" ", h);
  process.exit(1);
}
console.log("OPSEC surface check passed — no skill-chrome tokens in product UI paths.");
process.exit(0);
