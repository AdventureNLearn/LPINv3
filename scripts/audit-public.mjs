#!/usr/bin/env node
/**
 * Full public-release audit (O1–O7). Exit non-zero if any gate fails.
 * Usage: node scripts/audit-public.mjs
 *        node scripts/audit-public.mjs --skip-build
 */
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = process.cwd();
const skipBuild = process.argv.includes("--skip-build");

const steps = [
  { id: "O1", name: "geo OPSEC", cmd: ["node", "scripts/opsec-geo-check.mjs"] },
  { id: "O2", name: "secrets", cmd: ["node", "scripts/opsec-secrets-check.mjs"] },
  { id: "O3", name: "surface", cmd: ["node", "scripts/opsec-surface-check.mjs"] },
  { id: "O4", name: "densify guard", cmd: ["node", "scripts/assert-public-build.mjs"] },
  { id: "O5", name: "portable", cmd: ["node", "scripts/opsec-portable-check.mjs"] },
  {
    id: "O7a",
    name: "typecheck",
    cmd: ["node", "node_modules/typescript/bin/tsc", "--noEmit"],
  },
];

if (!skipBuild) {
  steps.push({
    id: "O7b",
    name: "product build",
    cmd: ["node", "node_modules/vite/bin/vite.js", "build"],
  });
}

console.log("");
console.log("══════════════════════════════════════════");
console.log(" LPIN public audit  (forkable product)");
console.log("══════════════════════════════════════════");
console.log("");

let failed = 0;
for (const step of steps) {
  process.stdout.write(`  [${step.id}] ${step.name} … `);
  const r = spawnSync(step.cmd[0], step.cmd.slice(1), {
    cwd: ROOT,
    encoding: "utf8",
    env: { ...process.env, VITE_LPIN_LAB_SCALE: undefined },
  });
  // Ensure lab flag cannot sneak in from parent env for densify/build steps
  if (r.status === 0) {
    console.log("OK");
  } else {
    console.log("FAIL");
    failed += 1;
    if (r.stdout) console.log(r.stdout);
    if (r.stderr) console.error(r.stderr);
  }
}

console.log("");
if (failed) {
  console.error(`audit:public FAILED — ${failed} gate(s) red. Do not publish.`);
  process.exit(1);
}
console.log("audit:public PASSED — safe to consider public tag (still requires human publish).");
process.exit(0);
