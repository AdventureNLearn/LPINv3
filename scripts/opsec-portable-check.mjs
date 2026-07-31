#!/usr/bin/env node
/**
 * Fail if product scripts/docs hard-require host paths that break forks.
 * Allows mentions in PUBLIC-RELEASE / audit reports as documentation of the dual track.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const ROOTS = ["scripts", "src"];
const ROOT_DOCS = [
  "README.md",
  "package.json",
  "BUILD-GUIDELINES.md",
  "PUBLIC_SURFACE_CONTRACT.md",
  "ORIGIN.md",
];

// Patterns that make the tree non-forkable when used as defaults.
const FORBIDDEN = [
  { re: /\/workspace\//, why: "hardcoded /workspace path" },
  { re: /C:\\\\AOS\\/i, why: "hardcoded C:\\AOS path" },
  { re: /C:\/AOS\//i, why: "hardcoded C:/AOS path" },
];

// Default product port must not be documented as 8080 in package scripts / README
// (8080 is reserved on host for unrelated services).
const PORT_DOCS = [
  { file: "README.md", re: /:8080\b/, why: "README should document product port 8090, not 8080" },
  {
    file: "package.json",
    re: /--port 8080/,
    why: "package.json product scripts must not bind 8080",
  },
];

const SKIP_FILES = new Set([
  "opsec-portable-check.mjs",
  "opsec-geo-check.mjs",
  "opsec-secrets-check.mjs",
  "opsec-surface-check.mjs",
  "audit-public.mjs",
]);

const hits = [];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (SKIP_FILES.has(name)) continue;
    if (name === "node_modules" || name === ".git") continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) walk(p, out);
    else if (/\.(mjs|js|ts|tsx|md|json)$/.test(name)) out.push(p);
  }
  return out;
}

for (const root of ROOTS) {
  for (const file of walk(join(ROOT, root))) {
    const text = readFileSync(file, "utf8");
    // Allow env-overridable defaults that only mention /workspace as fallback
    // after LPIN_QA_SHOTS — still fail if /workspace is the only path with no cwd option.
    for (const { re, why } of FORBIDDEN) {
      if (!re.test(text)) continue;
      // Fail any /workspace hardcode in scripts (must use cwd or env).
      const lines = text.split(/\n/);
      lines.forEach((line, i) => {
        if (re.test(line) && !line.includes("LPIN_QA_SHOTS")) {
          hits.push(`${file}:${i + 1}: ${why} :: ${line.trim().slice(0, 100)}`);
        } else if (re.test(line) && line.includes("/workspace/") && !line.includes("||")) {
          hits.push(`${file}:${i + 1}: ${why} :: ${line.trim().slice(0, 100)}`);
        }
      });
    }
  }
}

for (const rel of ROOT_DOCS) {
  const file = join(ROOT, rel);
  try {
    const text = readFileSync(file, "utf8");
    for (const { re, why } of FORBIDDEN) {
      if (re.test(text) && rel === "BUILD-GUIDELINES.md") {
        // BUILD-GUIDELINES may mention ops path as optional companion — warn only via hit if absolute required.
        if (/must read C:\\AOS/i.test(text)) {
          hits.push(`${file}: ${why}`);
        }
        continue;
      }
      if (re.test(text) && (rel === "README.md" || rel === "package.json")) {
        const lines = text.split(/\n/);
        lines.forEach((line, i) => {
          if (re.test(line)) {
            hits.push(`${file}:${i + 1}: ${why} :: ${line.trim().slice(0, 100)}`);
          }
        });
      }
    }
  } catch {
    /* missing optional */
  }
}

for (const { file, re, why } of PORT_DOCS) {
  try {
    const text = readFileSync(join(ROOT, file), "utf8");
    if (re.test(text)) hits.push(`${file}: ${why}`);
  } catch {
    /* ignore */
  }
}

// scripts defaulting to 8080 without env override
for (const file of walk(join(ROOT, "scripts"))) {
  if (SKIP_FILES.has(file.split(/[/\\]/).pop())) continue;
  const text = readFileSync(file, "utf8");
  if (/127\.0\.0\.1:8080/.test(text) && !/LPIN_BASE_URL/.test(text)) {
    hits.push(`${file}: hardcodes 8080 without LPIN_BASE_URL override`);
  } else if (/127\.0\.0\.1:8080/.test(text) && /LPIN_BASE_URL/.test(text)) {
    // default still 8080 — fail for product portability
    if (/8080/.test(text) && !/8090/.test(text)) {
      hits.push(`${file}: default BASE still 8080; product default is 8090`);
    }
  }
}

if (hits.length) {
  console.error("OPSEC portable check FAILED — host coupling / bad defaults:\n");
  for (const h of hits.slice(0, 40)) console.error(" ", h);
  if (hits.length > 40) console.error(`  … +${hits.length - 40} more`);
  process.exit(1);
}
console.log("OPSEC portable check passed — no forbidden host defaults in product scripts/docs.");
process.exit(0);
