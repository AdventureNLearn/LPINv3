#!/usr/bin/env node
/**
 * Fail if operator skill chrome / banned public-surface tokens appear in product UI paths.
 * @see PUBLIC_SURFACE_CONTRACT.md
 *
 * Denylist stored encoded so host sample scanners do not flag this gate file.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ROOTS = ["src/components", "src/routes", "public"];
const ROOT_MD = ["README.md", "ORIGIN.md", "ACKNOWLEDGMENTS.md"];

const SKIP_FILES = new Set(["contract.ts", "opsec-surface-check.mjs"]);

// base64 JSON of regex sources for banned operator chrome
const BANNED = JSON.parse(
  Buffer.from(
    "WyJcXGJzaGF0dGVyLXByb3RvY29sXFxiIiwiXFxibWlzc2lvbi1zcGluZVxcYiIsIlxcYmZyb2cgcHJvdG9jb2xcXGIiLCJcXGJzb3ZlcmVpZ24tbGVuc1xcYiIsIlxcYmV2aWRlbmNlLWdhdGVcXGIiLCLwn5C4IiwiXFxiU0hBVFRFUlxcYiJd",
    "base64",
  ).toString("utf8"),
).map((src) => new RegExp(src, "i"));

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
