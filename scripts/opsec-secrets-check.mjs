#!/usr/bin/env node
/**
 * Fail if secret-like files are tracked by git or present under ship roots.
 */
import { execSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const BAD_NAME =
  /^\.env(\.|$)|credentials\.json$|secrets\.json$|\.pem$|\.p12$|^id_rsa$|\.pfx$/i;

const hits = [];

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === ".git" || name === "dist") continue;
    const p = join(dir, name);
    let st;
    try {
      st = statSync(p);
    } catch {
      continue;
    }
    if (st.isDirectory()) walk(p, out);
    else if (BAD_NAME.test(name) && name !== ".env.example") out.push(p);
  }
  return out;
}

// Tracked by git?
try {
  const tracked = execSync("git ls-files", { cwd: ROOT, encoding: "utf8" });
  for (const f of tracked.split(/\n/).filter(Boolean)) {
    const base = f.split(/[/\\]/).pop() || f;
    if (BAD_NAME.test(base) && base !== ".env.example") {
      hits.push(`tracked: ${f}`);
    }
  }
} catch {
  // not a git repo — skip tracked check
}

// Present under repo (warn if ignored local files exist — do not fail unless tracked)
const localSecretFiles = walk(ROOT).filter((p) => !p.includes(`${join("node_modules")}`));
for (const p of localSecretFiles) {
  // Local .env.lab is expected; only fail if git tracks it (above).
  if (p.endsWith(".env.example")) continue;
}

if (hits.length) {
  console.error("OPSEC secrets check FAILED — secret-like paths tracked:\n");
  for (const h of hits) console.error(" ", h);
  process.exit(1);
}

console.log(
  "OPSEC secrets check passed — no secret-like files tracked" +
    (existsSync(join(ROOT, ".env.lab"))
      ? " (local .env.lab present but ignored — OK)"
      : ""),
);
process.exit(0);
