#!/usr/bin/env node
/**
 * One-shot OPSEC scrub for project-catalog.ts.
 * - Replaces municipality city names with "Demo metro (ST)"
 * - Strips city tokens from names/blurbs/slugs
 * - Coarsens lat/lon to state centroids
 * - Bumps PROJECT_SEED_VERSION
 *
 * Preserves original as project-catalog.lab.ts (gitignored for public track).
 */
import { copyFileSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ROOT = process.cwd();
const SRC = join(ROOT, "src/lib/jobsite/project-catalog.ts");
const LAB = join(ROOT, "src/lib/jobsite/project-catalog.lab.ts");

/** Coarse state centroids (demo pins only — not site truth). */
const STATE_PIN = {
  AL: [32.8, -86.8],
  AK: [64.2, -149.5],
  AZ: [34.3, -111.7],
  AR: [34.9, -92.4],
  CA: [36.8, -119.4],
  CO: [39.0, -105.5],
  CT: [41.6, -72.7],
  DC: [38.9, -77.0],
  DE: [39.0, -75.5],
  FL: [28.1, -81.7],
  GA: [32.7, -83.2],
  HI: [20.3, -156.4],
  IA: [42.0, -93.5],
  ID: [44.4, -114.6],
  IL: [40.0, -89.4],
  IN: [39.9, -86.3],
  KS: [38.5, -98.3],
  KY: [37.5, -85.3],
  LA: [31.0, -92.0],
  MA: [42.2, -71.5],
  MD: [39.0, -76.7],
  ME: [45.3, -69.2],
  MI: [44.3, -85.4],
  MN: [46.3, -94.3],
  MO: [38.4, -92.5],
  MS: [32.7, -89.7],
  MT: [47.0, -109.6],
  NC: [35.6, -79.8],
  ND: [47.5, -100.5],
  NE: [41.5, -99.8],
  NH: [43.7, -71.6],
  NJ: [40.1, -74.5],
  NM: [34.4, -106.1],
  NV: [39.3, -116.6],
  NY: [42.9, -75.5],
  OH: [40.4, -82.8],
  OK: [35.6, -97.5],
  OR: [44.0, -120.5],
  PA: [40.9, -77.8],
  RI: [41.7, -71.5],
  SC: [33.9, -80.9],
  SD: [44.4, -100.2],
  TN: [35.9, -86.4],
  TX: [31.5, -99.3],
  UT: [39.3, -111.7],
  VA: [37.5, -78.9],
  VT: [44.0, -72.7],
  WA: [47.4, -120.5],
  WI: [44.6, -89.8],
  WV: [38.6, -80.6],
  WY: [43.0, -107.6],
};

// Preserve lab copy once
try {
  copyFileSync(SRC, LAB);
  console.log("Wrote lab snapshot:", LAB);
} catch (e) {
  console.warn("Could not write lab snapshot:", e.message);
}

let text = readFileSync(SRC, "utf8");

// Split seed objects roughly by "slug:"
const headerEnd = text.indexOf("const SEEDS");
const seedsStart = text.indexOf("[", headerEnd);
const seedsEnd = text.indexOf("];", seedsStart);
if (seedsStart < 0 || seedsEnd < 0) {
  console.error("Could not locate SEEDS array");
  process.exit(1);
}

const header = text.slice(0, seedsStart + 1);
const footer = text.slice(seedsEnd);
const body = text.slice(seedsStart + 1, seedsEnd);

const blocks = body.split(/\n  \{/).filter((b) => b.includes("slug:"));
const scrubbed = blocks.map((raw, idx) => {
  let b = raw.startsWith("\n") ? raw : "\n  {\n" + raw;
  if (!b.trimStart().startsWith("{")) b = "\n  {" + (raw.startsWith("\n") ? raw : raw);

  // Normalize block form
  if (!b.includes("slug:")) return null;
  const block = b.startsWith("\n  {") ? b : `\n  {${b}`;

  const stateM = block.match(/stateCode:\s*"([A-Z]{2})"/);
  const industryM = block.match(/industry:\s*"([^"]+)"/);
  const slugM = block.match(/slug:\s*"([^"]+)"/);
  if (!stateM || !industryM || !slugM) {
    console.warn("skip block", idx, slugM?.[1]);
    return block;
  }
  const st = stateM[1];
  const industry = industryM[1];
  const oldSlug = slugM[1];
  const pin = STATE_PIN[st] || [39.5, -98.0];

  // Stable opsec slug: state + industry + short hash of old slug
  const indShort = industry.replace(/_/g, "-").slice(0, 16);
  const tail = oldSlug.replace(/[^a-z0-9]+/gi, "").slice(-6) || String(idx);
  const newSlug = `${st.toLowerCase()}-${indShort}-${tail}`.toLowerCase();

  let out = block;
  out = out.replace(/slug:\s*"[^"]+"/, `slug: "${newSlug}"`);
  out = out.replace(/city:\s*"[^"]+"/, `city: "Demo metro (${st})"`);
  out = out.replace(/lat:\s*-?[\d.]+/, `lat: ${pin[0]}`);
  out = out.replace(/lon:\s*-?[\d.]+/, `lon: ${pin[1]}`);

  // Names: strip common city / neighborhood tokens
  out = out.replace(/name:\s*"([^"]+)"/, (_, name) => {
    let n = name
      .replace(/\b(San Francisco|Los Angeles|San Diego|New York|New Orleans|Oklahoma City|Kansas City|Salt Lake City|Las Vegas|El Paso)\b/gi, "")
      .replace(/\b(Miami|Chicago|Houston|Dallas|Boston|Atlanta|Seattle|Denver|Phoenix|Austin|Tampa|Orlando|Jacksonville|Portland|Baltimore|Philadelphia|Detroit|Minneapolis|Milwaukee|Cleveland|Columbus|Nashville|Memphis|Charlotte|Raleigh|Richmond|Charleston|Honolulu|Anchorage|Boise|Reno|Tucson|Albuquerque|Omaha|Fargo|Billings|Buffalo|Newark|Pittsburgh|Indianapolis|Tulsa|Albany|Hilo)\b/gi, "")
      .replace(/\b(Mission Bay|South Park|Torrey Pines|Elliott Bay|Uptown|Midtown|Downtown|DTLA|River City|Borderland|Arts District|Capital Region)\b/gi, "")
      .replace(/\s{2,}/g, " ")
      .replace(/^[\s—\-–]+|[\s—\-–]+$/g, "")
      .trim();
    if (!n || n.length < 4) {
      n = `${st} ${industry.replace(/_/g, " ")} demo site`;
    }
    // Title-ish
    n = n.replace(/\b\w/g, (c) => c.toUpperCase());
    return `name: "${n}"`;
  });

  out = out.replace(/blurb:\s*"([^"]+)"/, (_, blurb) => {
    let x = blurb
      .replace(/\b(San Francisco|Los Angeles|Miami|Chicago|Houston|Dallas|Boston|Atlanta|Seattle|Denver|Phoenix|NYC|New York)\b/gi, "demo metro")
      .replace(/\b(bay fill|waterfront hospitality)\b/gi, "coastal conditions");
    return `blurb: "${x}"`;
  });

  out = out.replace(
    /permitOffice:\s*"[^"]+"/,
    `permitOffice: "Local building department (demo)"`,
  );

  // Ensure block starts correctly
  if (!out.trimStart().startsWith("{")) {
    out = "\n  {" + out;
  } else if (!out.startsWith("\n")) {
    out = "\n  " + out.trimStart();
  }
  // Fix double braces
  out = out.replace(/^\n  \{\n  \{/, "\n  {");
  return out;
}).filter(Boolean);

// Re-join blocks: each should be `\n  { ... },` or last without comma issues
const joined = scrubbed
  .map((b, i) => {
    let s = b.trimEnd();
    if (!s.startsWith("{") && !s.includes("{")) s = "{ " + s;
    // normalize opening
    if (s.startsWith("{")) s = "\n  " + s;
    if (!s.trimStart().startsWith("{")) {
      s = "\n  {\n" + s;
    }
    // ensure closing brace
    if (!/}\s*,?\s*$/.test(s)) {
      // already has }
    }
    // comma between objects
    if (i < scrubbed.length - 1 && !s.trimEnd().endsWith(",")) {
      if (s.trimEnd().endsWith("}")) s = s.trimEnd() + ",";
    }
    return s.startsWith("\n  {") ? s : "\n  " + s.trim();
  })
  .join("");

let newHeader = header
  .replace(
    /Dynamic local project baseline[^\n]*/,
    "OPSEC-safe portfolio baseline — ~50 US *regions* (no municipality names),",
  )
  .replace(
    /Synthetic field data only; no real municipality PII\./,
    "Synthetic field data only. Locality labels are demo metros by state — not real cities (HARD-RULES geo OPSEC).",
  );

let newFooter = footer.replace(
  /export const PROJECT_SEED_VERSION = \d+;/,
  "export const PROJECT_SEED_VERSION = 9;",
);

// Rebuild SEEDS more carefully by transforming original with line-oriented approach instead
// Fallback: line-based transform of original (more reliable)

text = readFileSync(SRC, "utf8");
// restore from lab if we already overwrote - we copied first so LAB has original
const original = readFileSync(LAB, "utf8");
text = original;

const lines = text.split(/\n/);
let stateCode = "US";
let industry = "commercial";
let slug = "demo";
let inSeed = false;
const outLines = [];

for (let i = 0; i < lines.length; i++) {
  let line = lines[i];

  const st = line.match(/stateCode:\s*"([A-Z]{2})"/);
  if (st) stateCode = st[1];
  const ind = line.match(/industry:\s*"([^"]+)"/);
  if (ind) industry = ind[1];
  const sl = line.match(/slug:\s*"([^"]+)"/);
  if (sl) {
    slug = sl[1];
    inSeed = true;
    const indShort = industry.replace(/_/g, "-").slice(0, 16);
    const tail = slug.replace(/[^a-z0-9]+/gi, "").slice(-6) || "site";
    const newSlug = `${stateCode.toLowerCase()}-${indShort}-${tail}`.toLowerCase();
    // industry may not be known yet on slug line — look ahead
    let lookInd = industry;
    for (let j = i; j < Math.min(i + 12, lines.length); j++) {
      const m = lines[j].match(/industry:\s*"([^"]+)"/);
      if (m) {
        lookInd = m[1];
        break;
      }
    }
    let lookSt = stateCode;
    for (let j = i; j < Math.min(i + 12, lines.length); j++) {
      const m = lines[j].match(/stateCode:\s*"([A-Z]{2})"/);
      if (m) {
        lookSt = m[1];
        break;
      }
    }
    const indS = lookInd.replace(/_/g, "-").slice(0, 16);
    const newS = `${lookSt.toLowerCase()}-${indS}-${tail}`.toLowerCase();
    line = line.replace(/slug:\s*"[^"]+"/, `slug: "${newS}"`);
    slug = newS;
    stateCode = lookSt;
    industry = lookInd;
  }

  if (/city:\s*"/.test(line)) {
    line = line.replace(/city:\s*"[^"]+"/, `city: "Demo metro (${stateCode})"`);
  }
  if (/lat:\s*-?[\d.]+/.test(line)) {
    const pin = STATE_PIN[stateCode] || [39.5, -98.0];
    line = line.replace(/lat:\s*-?[\d.]+/, `lat: ${pin[0]}`);
  }
  if (/lon:\s*-?[\d.]+/.test(line)) {
    const pin = STATE_PIN[stateCode] || [39.5, -98.0];
    line = line.replace(/lon:\s*-?[\d.]+/, `lon: ${pin[1]}`);
  }
  if (/name:\s*"/.test(line)) {
    line = line.replace(/name:\s*"([^"]+)"/, (_, name) => {
      let n = name
        .replace(
          /\b(San Francisco|Los Angeles|San Diego|New York|New Orleans|Oklahoma City|Kansas City|Salt Lake City|Las Vegas|El Paso|St\. Louis)\b/gi,
          "",
        )
        .replace(
          /\b(Miami|Chicago|Houston|Dallas|Boston|Atlanta|Seattle|Denver|Phoenix|Austin|Tampa|Orlando|Jacksonville|Portland|Baltimore|Philadelphia|Detroit|Minneapolis|Milwaukee|Cleveland|Columbus|Nashville|Memphis|Charlotte|Raleigh|Richmond|Charleston|Honolulu|Anchorage|Boise|Reno|Tucson|Albuquerque|Omaha|Fargo|Billings|Buffalo|Newark|Pittsburgh|Indianapolis|Tulsa|Albany|Hilo|Sacramento)\b/gi,
          "",
        )
        .replace(
          /\b(Mission Bay|South Park|Torrey Pines|Elliott Bay|Uptown|Midtown|Downtown|DTLA|River City|Borderland|Arts District|Capital Region)\b/gi,
          "",
        )
        .replace(/\s{2,}/g, " ")
        .replace(/^[\s—\-–:]+|[\s—\-–:]+$/g, "")
        .trim();
      if (!n || n.length < 3) {
        n = `${stateCode} ${industry.replace(/_/g, " ")} demo`;
      }
      return `name: "${n}"`;
    });
  }
  if (/blurb:\s*"/.test(line)) {
    line = line.replace(/blurb:\s*"([^"]+)"/, (_, blurb) => {
      const x = blurb
        .replace(
          /\b(San Francisco|Los Angeles|Miami|Chicago|Houston|Dallas|Boston|Atlanta|Seattle|Denver|Phoenix|NYC|New York|Austin|Tampa)\b/gi,
          "the demo metro",
        )
        .replace(/\bbay fill\b/gi, "soft soils");
      return `blurb: "${x}"`;
    });
  }
  if (/permitOffice:\s*"/.test(line)) {
    line = line.replace(
      /permitOffice:\s*"[^"]+"/,
      `permitOffice: "Local building department (demo)"`,
    );
  }
  if (/PROJECT_SEED_VERSION = \d+/.test(line)) {
    line = line.replace(/PROJECT_SEED_VERSION = \d+/, "PROJECT_SEED_VERSION = 9");
  }
  if (i < 6 && /municipality PII/.test(line)) {
    line =
      " * Synthetic field data only. Locality = demo metro by state — not real cities (geo OPSEC).";
  }
  if (i < 6 && /Dynamic local project baseline/.test(line)) {
    line =
      " * OPSEC-safe portfolio baseline — ~50 US regions (no municipality names),";
  }

  outLines.push(line);
}

writeFileSync(SRC, outLines.join("\n"), "utf8");
console.log("Scrubbed", SRC);
console.log("Lab original preserved at", LAB);
console.log("Seed version → 9");
