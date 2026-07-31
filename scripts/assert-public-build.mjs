/**
 * Refuse default production builds when lab scale densify is enabled.
 * Prevents accidental public release of IX-15M / 285k-msg seed path.
 *
 * Usage: node scripts/assert-public-build.mjs
 * Exit 1 if VITE_LPIN_LAB_SCALE=1
 */

const flag = process.env.VITE_LPIN_LAB_SCALE;
if (flag === "1") {
  console.error("");
  console.error("[assert-public-build] REFUSED: VITE_LPIN_LAB_SCALE=1");
  console.error(
    "  Lab-scale densify (15-min portfolio streams) must not ship on the default public product build.",
  );
  console.error("  Use: npm run build:lab  for intentional private research builds only.");
  console.error("  See BUILD-GUIDELINES.md (D1, D7).");
  console.error("");
  process.exit(1);
}

console.log("[assert-public-build] OK — product build (lab scale flag off)");
