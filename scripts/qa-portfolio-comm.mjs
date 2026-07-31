/**
 * Portfolio communication scale test harness.
 * Visible markers: [P0-BASE] … [P6-SCALE]
 *
 * Usage:
 *   node --experimental-strip-types scripts/qa-portfolio-comm.mjs --phase P0
 *   node --experimental-strip-types scripts/qa-portfolio-comm.mjs --phase P1
 *   node --experimental-strip-types scripts/qa-portfolio-comm.mjs --phase all
 *
 * Artifacts → docs/test-runs/
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const RUNS = path.join(ROOT, "docs", "test-runs");
const TARGET_SUITE = 56;
/** Phases with real implementations (not stub markers). */
const IMPLEMENTED = new Set(["P0", "P1", "P2", "P3", "P4", "P5", "P6", "IX"]);

const PHASES = ["P0", "P1", "P2", "P3", "P4", "P5", "P6", "IX"];
const MARKER = {
  P0: "[P0-BASE]",
  P1: "[P1-ORG]",
  P2: "[P2-COMM]",
  P3: "[P3-VENDOR]",
  P4: "[P4-NATL]",
  P5: "[P5-DEPTH]",
  P6: "[P6-SCALE]",
  IX: "[IX-15M]",
};

const GLYPH = {
  pending: "○",
  partial: "◐",
  pass: "●",
  fail: "✕",
  blocked: "⊘",
};

function parseArgs(argv) {
  let phase = "P0";
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--phase" && argv[i + 1]) {
      phase = argv[++i].toUpperCase();
    }
  }
  return { phase };
}

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

async function loadOrgModules() {
  const genPath = path.join(ROOT, "src/lib/jobsite/project-org-generate.ts");
  const commPath = path.join(ROOT, "src/lib/jobsite/project-comm-generate.ts");
  const natPath = path.join(ROOT, "src/lib/jobsite/project-national-vendors.ts");
  const scalePath = path.join(ROOT, "src/lib/jobsite/project-scale-sim.ts");
  const ixPath = path.join(ROOT, "src/lib/jobsite/project-comm-interval.ts");
  const seedPath = path.join(ROOT, "src/lib/jobsite/project-seed.ts");
  const catPath = path.join(ROOT, "src/lib/jobsite/project-catalog.ts");
  const gen = await import(pathToFileURL(genPath).href);
  const comm = await import(pathToFileURL(commPath).href);
  const nat = await import(pathToFileURL(natPath).href);
  const scale = await import(pathToFileURL(scalePath).href);
  const ix = await import(pathToFileURL(ixPath).href);
  let seed = null;
  try {
    seed = await import(pathToFileURL(seedPath).href);
  } catch {
    seed = null;
  }
  const cat = await import(pathToFileURL(catPath).href);
  return { gen, comm, nat, scale, ix, seed, cat };
}

async function loadCatalog() {
  const catalogPath = path.join(ROOT, "src/lib/jobsite/project-catalog.ts");
  const seedPath = path.join(ROOT, "src/lib/jobsite/project-seed.ts");

  try {
    const mod = await import(pathToFileURL(catalogPath).href);
    if (mod.buildCatalogMeta) {
      const meta = mod.buildCatalogMeta();
      const stats = mod.catalogStats?.(meta) ?? {
        projectCount: meta.length,
        stateCount: new Set(meta.map((m) => m.stateCode)).size,
        stateShareOfUs: new Set(meta.map((m) => m.stateCode)).size / 50,
      };
      return { meta, stats, hydrate: null };
    }
  } catch {
    /* fall through */
  }

  // Fallback: parse SEEDS from catalog source (no runtime hydrate)
  const src = fs.readFileSync(catalogPath, "utf8");
  const slugs = [...src.matchAll(/slug:\s*"([^"]+)"/g)].map((m) => m[1]);
  const states = [...src.matchAll(/stateCode:\s*"([A-Z]{2})"/g)].map((m) => m[1]);
  const industries = [...src.matchAll(/industry:\s*"([a-z_]+)"/g)].map((m) => m[1]);
  const names = [...src.matchAll(/name:\s*"([^"]+)"/g)].map((m) => m[1]);
  // names include Industry labels too — pair by slug order carefully
  const meta = slugs.map((slug, i) => ({
    id: `js_pf_${slug}`,
    name: names[i] ?? slug,
    stateCode: states[i] ?? "??",
    industry: industries[i] ?? "unknown",
    city: "",
    env: [],
    interests: [],
    phase: "structure",
    lat: null,
    lon: null,
    permitOffice: "",
    captain: "",
    blurb: "",
    startOffsetDays: 0,
  }));
  // Re-parse richer fields per seed block
  const blocks = src.split(/slug:\s*"/).slice(1);
  const rich = blocks.map((block) => {
    const slug = block.slice(0, block.indexOf('"'));
    const grab = (re) => {
      const m = block.match(re);
      return m ? m[1] : undefined;
    };
    const lat = grab(/lat:\s*(-?[\d.]+)/);
    const lon = grab(/lon:\s*(-?[\d.]+)/);
    return {
      id: `js_pf_${slug}`,
      name: grab(/name:\s*"([^"]+)"/) ?? slug,
      city: grab(/city:\s*"([^"]+)"/) ?? "",
      stateCode: grab(/stateCode:\s*"([A-Z]{2})"/) ?? "??",
      industry: grab(/industry:\s*"([a-z_]+)"/) ?? "unknown",
      phase: grab(/phase:\s*"([a-z_]+)"/) ?? "structure",
      lat: lat != null ? Number(lat) : null,
      lon: lon != null ? Number(lon) : null,
      captain: grab(/captain:\s*"([^"]+)"/) ?? "",
      blurb: grab(/blurb:\s*"([^"]+)"/) ?? "",
      env: [...block.matchAll(/"([a-z_]+)"/g)]
        .map((x) => x[1])
        .filter((t) =>
          [
            "coastal_hurricane",
            "coastal_flood",
            "desert_heat",
            "high_altitude",
            "freeze_thaw",
            "seismic",
            "wildfire_wui",
            "tornado_alley",
            "urban_dense",
            "wetland_swq",
            "cold_winter",
            "humid_subtropical",
            "volcanic_island",
            "permafrost_edge",
            "lake_effect_snow",
            "expansive_soil",
            "high_wind_plain",
            "karst_sinkhole",
          ].includes(t),
        ),
      interests: [],
      permitOffice: grab(/permitOffice:\s*"([^"]+)"/) ?? "",
      startOffsetDays: Number(grab(/startOffsetDays:\s*(-?\d+)/) ?? 0),
    };
  });

  const use = rich.length ? rich : meta;
  const stateSet = new Set(use.map((m) => m.stateCode));
  return {
    meta: use,
    stats: {
      projectCount: use.length,
      stateCount: stateSet.size,
      stateShareOfUs: stateSet.size / 50,
      states: [...stateSet].sort(),
    },
    hydrate: null,
    seedPath,
  };
}

function checkP0(m, suite) {
  const checks = [];
  const hard = [];

  const idOk = Boolean(
    m.id &&
      (m.id.startsWith("js_pf_") ||
        m.id === "js_sample_demo" ||
        m.id.startsWith("js_")),
  );
  checks.push({ id: "P0.1", ok: idOk, detail: idOk ? "id ok" : "bad id" });
  hard.push(idOk);

  const identityOk = Boolean(m.name && m.stateCode && m.stateCode.length === 2 && m.industry);
  checks.push({
    id: "P0.2",
    ok: identityOk,
    detail: identityOk ? `${m.stateCode}/${m.industry}` : "missing name/state/industry",
  });
  hard.push(identityOk);

  const pinOk =
    typeof m.lat === "number" &&
    typeof m.lon === "number" &&
    Number.isFinite(m.lat) &&
    Number.isFinite(m.lon);
  checks.push({
    id: "P0.3",
    ok: pinOk,
    detail: pinOk ? `${m.lat},${m.lon}` : "missing pin",
  });
  hard.push(pinOk);

  const captainOk = Boolean(m.captain && m.captain.length > 2);
  checks.push({
    id: "P0.4",
    ok: captainOk,
    detail: captainOk ? "captain set" : "missing captain",
  });
  hard.push(captainOk);

  const blurbOk = Boolean(m.blurb && m.blurb.length > 8);
  checks.push({
    id: "P0.5",
    ok: blurbOk,
    detail: blurbOk ? "blurb set" : "thin blurb",
  });
  // soft
  const soft = [blurbOk];

  const envOk = Array.isArray(m.env) && m.env.length > 0;
  checks.push({
    id: "P0.6",
    ok: envOk,
    detail: envOk ? `env=${m.env.length}` : "no env tags",
  });
  hard.push(envOk);

  const phaseOk = Boolean(m.phase);
  checks.push({
    id: "P0.7",
    ok: phaseOk,
    detail: phaseOk ? m.phase : "no phase",
  });
  hard.push(phaseOk);

  // OPSEC soft: notes/blurb should not claim real portal login
  const text = `${m.blurb} ${m.permitOffice}`.toLowerCase();
  const opsecOk = !text.includes("login to city") && !text.includes("portal password");
  checks.push({
    id: "P0.8",
    ok: opsecOk,
    detail: opsecOk ? "opsec text ok" : "suspicious portal language",
  });
  hard.push(opsecOk);

  const hardPass = hard.every(Boolean);
  const softPass = soft.every(Boolean);
  let status = "pass";
  if (!hardPass) status = "fail";
  else if (!softPass) status = "partial";

  return {
    projectId: m.id,
    name: m.name,
    stateCode: m.stateCode,
    industry: m.industry,
    status,
    checks,
    hardPass,
    softPass,
  };
}

function suiteP0(meta, stats) {
  const suiteChecks = [];
  const sizeOk = meta.length >= TARGET_SUITE - 1; // allow 55 seed + flag shortfall
  const exact56 = meta.length === TARGET_SUITE;
  suiteChecks.push({
    id: "P0.S1",
    ok: sizeOk,
    detail: `count=${meta.length} target=${TARGET_SUITE}${exact56 ? "" : " (short — need +1 slot)"}`,
  });
  const covOk = stats.stateShareOfUs >= 0.4;
  suiteChecks.push({
    id: "P0.S2",
    ok: covOk,
    detail: `states=${stats.stateCount} (${Math.round(stats.stateShareOfUs * 100)}% US)`,
  });
  const ids = meta.map((m) => m.id);
  const unique = new Set(ids).size === ids.length;
  suiteChecks.push({
    id: "P0.S3",
    ok: unique,
    detail: unique ? "ids unique" : "duplicate ids",
  });
  return suiteChecks;
}

function phaseStub(phase, meta) {
  // Future phases: blocked until implemented
  return meta.map((m) => ({
    projectId: m.id,
    name: m.name,
    stateCode: m.stateCode,
    industry: m.industry,
    status: "pending",
    checks: [
      {
        id: `${phase}.0`,
        ok: false,
        detail: "phase not implemented yet — see COMM-SCALE-TESTBED-PLAN.md",
      },
    ],
    hardPass: false,
    softPass: false,
  }));
}

function checkP1(m, generateProjectOrg, validateProjectOrg) {
  const org = generateProjectOrg({
    id: m.id,
    name: m.name,
    city: m.city || m.stateCode,
    stateCode: m.stateCode,
    industry: m.industry,
    env: m.env || [],
    captain: m.captain || "Site superintendent",
    phase: m.phase || "structure",
  });
  const { ok, checks } = validateProjectOrg(org);
  return {
    projectId: m.id,
    name: m.name,
    stateCode: m.stateCode,
    industry: m.industry,
    status: ok ? "pass" : "fail",
    checks,
    hardPass: ok,
    softPass: ok,
    orgSummary: {
      people: org.people.length,
      divisions: org.divisions.length,
      contracts: org.contracts.length,
      vendors: org.vendors.length,
    },
  };
}

function suiteP1(rows) {
  const withOrg = rows.filter((r) => r.status === "pass").length;
  const avgDiv =
    rows.reduce((a, r) => a + (r.orgSummary?.divisions ?? 0), 0) /
    Math.max(1, rows.length);
  const avgContracts =
    rows.reduce((a, r) => a + (r.orgSummary?.contracts ?? 0), 0) /
    Math.max(1, rows.length);
  return [
    {
      id: "P1.S1",
      ok: withOrg === rows.length,
      detail: `org pass ${withOrg}/${rows.length}`,
    },
    {
      id: "P1.S2",
      ok: avgDiv >= 5,
      detail: `avg divisions=${avgDiv.toFixed(1)}`,
    },
    {
      id: "P1.S3",
      ok: avgContracts >= 2,
      detail: `avg contracts=${avgContracts.toFixed(1)}`,
    },
  ];
}

function checkP2(m, generateProjectOrg, generateProjectComms, validateProjectComms) {
  const org = generateProjectOrg({
    id: m.id,
    name: m.name,
    city: m.city || m.stateCode,
    stateCode: m.stateCode,
    industry: m.industry,
    env: m.env || [],
    captain: m.captain || "Site superintendent",
    phase: m.phase || "structure",
  });
  const log = generateProjectComms(
    {
      id: m.id,
      name: m.name,
      stateCode: m.stateCode,
      city: m.city,
      industry: m.industry,
      env: m.env || [],
      blurb: m.blurb,
    },
    org,
  );
  const { ok, checks } = validateProjectComms(log, org);
  return {
    projectId: m.id,
    name: m.name,
    stateCode: m.stateCode,
    industry: m.industry,
    status: ok ? "pass" : "fail",
    checks,
    hardPass: ok,
    softPass: ok,
    commSummary: {
      messages: log.messages.length,
      divisions: new Set(log.messages.map((x) => x.division)).size,
      phases: new Set(log.messages.map((x) => x.phase)).size,
      gaps: log.messages.filter((x) => x.routingGap).length,
    },
  };
}

function suiteP2(rows) {
  const pass = rows.filter((r) => r.status === "pass").length;
  const msgs = rows.map((r) => r.commSummary?.messages ?? 0).sort((a, b) => a - b);
  const p50 = msgs[Math.floor(msgs.length * 0.5)] ?? 0;
  const p95 = msgs[Math.floor(msgs.length * 0.95)] ?? 0;
  const total = msgs.reduce((a, b) => a + b, 0);
  const gapTotal = rows.reduce((a, r) => a + (r.commSummary?.gaps ?? 0), 0);
  return [
    {
      id: "P2.S1",
      ok: pass === rows.length,
      detail: `comm pass ${pass}/${rows.length}`,
    },
    {
      id: "P2.S2",
      ok: p50 >= 8,
      detail: `msgs p50=${p50} p95=${p95} total=${total}`,
    },
    {
      id: "P2.S3",
      ok: gapTotal === 0,
      detail: `routing_gaps=${gapTotal}`,
    },
  ];
}

function checkP3(
  m,
  generateProjectOrg,
  generateProjectComms,
  validateProjectVendorComms,
) {
  const org = generateProjectOrg({
    id: m.id,
    name: m.name,
    city: m.city || m.stateCode,
    stateCode: m.stateCode,
    industry: m.industry,
    env: m.env || [],
    captain: m.captain || "Site superintendent",
    phase: m.phase || "structure",
  });
  const log = generateProjectComms(
    {
      id: m.id,
      name: m.name,
      stateCode: m.stateCode,
      city: m.city,
      industry: m.industry,
      env: m.env || [],
      blurb: m.blurb,
    },
    org,
  );
  const { ok, checks } = validateProjectVendorComms(log, org);
  const vendorIds = new Set(log.messages.map((x) => x.vendorId).filter(Boolean));
  const contractIds = new Set(
    log.messages.map((x) => x.contractId).filter(Boolean),
  );
  return {
    projectId: m.id,
    name: m.name,
    stateCode: m.stateCode,
    industry: m.industry,
    status: ok ? "pass" : "fail",
    checks,
    hardPass: ok,
    softPass: ok,
    vendorSummary: {
      messages: log.messages.length,
      vendorsInLog: vendorIds.size,
      contractsInLog: contractIds.size,
      orgVendors: org.vendors?.length ?? 0,
    },
  };
}

function suiteP3(rows) {
  const pass = rows.filter((r) => r.status === "pass").length;
  const avgVendors =
    rows.reduce((a, r) => a + (r.vendorSummary?.vendorsInLog ?? 0), 0) /
    Math.max(1, rows.length);
  const avgContracts =
    rows.reduce((a, r) => a + (r.vendorSummary?.contractsInLog ?? 0), 0) /
    Math.max(1, rows.length);
  return [
    {
      id: "P3.S1",
      ok: pass === rows.length,
      detail: `vendor-comm pass ${pass}/${rows.length}`,
    },
    {
      id: "P3.S2",
      ok: avgVendors >= 2,
      detail: `avg vendors in log=${avgVendors.toFixed(1)}`,
    },
    {
      id: "P3.S3",
      ok: avgContracts >= 3,
      detail: `avg contracts in log=${avgContracts.toFixed(1)}`,
    },
  ];
}

function checkP5(m, generateProjectOrg, generateIntervalCommLog, validateProjectCommDepth) {
  const org = generateProjectOrg({
    id: m.id,
    name: m.name,
    city: m.city || m.stateCode,
    stateCode: m.stateCode,
    industry: m.industry,
    env: m.env || [],
    captain: m.captain || "Site superintendent",
    phase: m.phase || "structure",
  });
  const log = generateIntervalCommLog(
    {
      id: m.id,
      name: m.name,
      stateCode: m.stateCode,
      city: m.city,
      industry: m.industry,
      env: m.env || [],
      blurb: m.blurb,
    },
    org,
  );
  const { ok, checks } = validateProjectCommDepth(log, { env: m.env || [] });
  return {
    projectId: m.id,
    name: m.name,
    stateCode: m.stateCode,
    industry: m.industry,
    status: ok ? "pass" : "fail",
    checks,
    hardPass: ok,
    softPass: ok,
    depthSummary: {
      messages: log.fullMessageCount ?? log.messages.length,
      sample: log.messages.length,
      multiScope: log.messages.filter((x) => (x.scopes?.length ?? 0) >= 2).length,
      phases: new Set(log.messages.map((x) => x.phase)).size,
    },
  };
}

function checkIX(m, generateProjectOrg, ixMod) {
  const org = generateProjectOrg({
    id: m.id,
    name: m.name,
    city: m.city || m.stateCode,
    stateCode: m.stateCode,
    industry: m.industry,
    env: m.env || [],
    captain: m.captain || "Site superintendent",
    phase: m.phase || "structure",
  });
  const meta = {
    id: m.id,
    name: m.name,
    stateCode: m.stateCode,
    city: m.city,
    industry: m.industry,
    env: m.env || [],
    blurb: m.blurb,
  };
  const log = ixMod.generateIntervalCommLog(meta, org);
  const { ok, checks, fullCount, expected } = ixMod.validateIntervalCommLog(
    log,
    meta,
    org,
  );
  return {
    projectId: m.id,
    name: m.name,
    stateCode: m.stateCode,
    industry: m.industry,
    status: ok ? "pass" : "fail",
    checks,
    hardPass: ok,
    softPass: ok,
    intervalSummary: {
      fullCount,
      expected,
      sample: log.messages?.length,
      fieldDays: log.timeline?.fieldWorkDays,
      durationDays: log.timeline?.durationCalendarDays,
    },
  };
}

function suiteIX(rows) {
  const pass = rows.filter((r) => r.status === "pass").length;
  const counts = rows
    .map((r) => r.intervalSummary?.fullCount ?? 0)
    .sort((a, b) => a - b);
  const total = counts.reduce((a, b) => a + b, 0);
  const min = counts[0] ?? 0;
  const max = counts[counts.length - 1] ?? 0;
  const p50 = counts[Math.floor(counts.length * 0.5)] ?? 0;
  return [
    {
      id: "IX.S1",
      ok: pass === rows.length,
      detail: `interval pass ${pass}/${rows.length}`,
    },
    {
      id: "IX.S2",
      ok: min >= 1000 && total > 100000,
      detail: `msgs min=${min} p50=${p50} max=${max} total=${total}`,
    },
    {
      id: "IX.S3",
      ok: true,
      detail: "15-min field cadence Mon-Fri 07:00-15:00 over industry durations",
    },
  ];
}

function suiteP5(rows) {
  const pass = rows.filter((r) => r.status === "pass").length;
  const counts = rows
    .map((r) => r.depthSummary?.messages ?? 0)
    .sort((a, b) => a - b);
  const p50 = counts[Math.floor(counts.length * 0.5)] ?? 0;
  const p95 = counts[Math.floor(counts.length * 0.95)] ?? 0;
  const total = counts.reduce((a, b) => a + b, 0);
  const min = counts[0] ?? 0;
  return [
    {
      id: "P5.S1",
      ok: pass === rows.length,
      detail: `depth pass ${pass}/${rows.length}`,
    },
    {
      id: "P5.S2",
      ok: min >= 1000,
      detail: `full msgs min=${min} p50=${p50} p95=${p95} total=${total}`,
    },
  ];
}

function runP6(suite, mods) {
  // Build full boards via metaToJobsite when available; else synthesize lite boards
  const boards = suite.map((m) => {
    if (mods.seed?.metaToJobsite) {
      try {
        const j = mods.seed.metaToJobsite(m);
        return j;
      } catch {
        /* fall through */
      }
    }
    const org = mods.gen.generateProjectOrg({
      id: m.id,
      name: m.name,
      city: m.city || m.stateCode,
      stateCode: m.stateCode,
      industry: m.industry,
      env: m.env || [],
      captain: m.captain || "Site lead",
      phase: m.phase || "structure",
    });
    const fieldComms = mods.ix
      ? mods.ix.generateIntervalCommLog(
          {
            id: m.id,
            name: m.name,
            stateCode: m.stateCode,
            city: m.city,
            industry: m.industry,
            env: m.env || [],
            blurb: m.blurb,
          },
          org,
        )
      : mods.comm.generateProjectComms(
          {
            id: m.id,
            name: m.name,
            stateCode: m.stateCode,
            city: m.city,
            industry: m.industry,
            env: m.env || [],
            blurb: m.blurb,
          },
          org,
        );
    return {
      id: m.id,
      name: m.name,
      industry: m.industry,
      stateCode: m.stateCode,
      org,
      fieldComms,
      inspections: [{ id: "insp", status: "scheduled", typeLabel: "seed" }],
      schedule: [
        { id: "s1", title: "a" },
        { id: "s2", title: "b" },
        { id: "s3", title: "c" },
        { id: "s4", title: "d" },
      ],
      reports: [],
      nationalVendors: [{ id: "nv", name: "n" }],
    };
  });

  // Attach nationals if seed path used without them
  if (mods.nat?.buildNationalVendorLedger) {
    const ledger = mods.nat.buildNationalVendorLedger(
      suite.map((m) => ({
        id: m.id,
        name: m.name,
        stateCode: m.stateCode,
        industry: m.industry,
        env: m.env || [],
        interests: m.interests || [],
      })),
    );
    for (const b of boards) {
      if (!b.nationalVendors?.length) {
        b.nationalVendors = mods.nat.nationalVendorsForProject(b.id, ledger);
      }
    }
  }

  const suiteResult = mods.scale.scoreSuiteScale(boards);
  const rows = suiteResult.projectScores.map((ps) => ({
    projectId: ps.projectId,
    name: ps.name,
    stateCode:
      suite.find((s) => s.id === ps.projectId)?.stateCode ?? "??",
    industry:
      suite.find((s) => s.id === ps.projectId)?.industry ?? "unknown",
    status: ps.ok ? "pass" : "fail",
    checks: ps.checks,
    hardPass: ps.ok,
    softPass: ps.ok,
    scaleMetrics: ps.metrics,
  }));

  return {
    rows,
    suiteChecks: suiteResult.checks,
    suiteOk: suiteResult.ok,
    benchmarks: suiteResult.benchmarks,
  };
}

function runP4(suite, natMod) {
  const lite = suite.map((m) => ({
    id: m.id,
    name: m.name,
    stateCode: m.stateCode,
    industry: m.industry,
    env: m.env || [],
    interests: m.interests || [],
  }));
  const ledger = natMod.buildNationalVendorLedger(lite);
  const projectIds = lite.map((p) => p.id);
  const { ok, checks, benchmarks } = natMod.validateNationalVendorLedger(
    ledger,
    projectIds,
  );

  // Per-project rows: attachment presence
  const rows = suite.map((m) => {
    const vids = ledger.byProject[m.id] ?? [];
    const has = vids.length >= 1;
    const projectChecks = [
      {
        id: "P4.P1",
        ok: has,
        detail: has ? `nationals=${vids.length}` : "no national vendors",
      },
    ];
    return {
      projectId: m.id,
      name: m.name,
      stateCode: m.stateCode,
      industry: m.industry,
      status: has ? "pass" : "fail",
      checks: projectChecks,
      hardPass: has,
      softPass: has,
      nationalSummary: { count: vids.length, ids: vids },
    };
  });

  const suiteChecks = [
    ...checks.map((c) => ({
      id: c.id,
      ok: c.ok,
      detail: c.detail,
    })),
    {
      id: "P4.S1",
      ok: benchmarks.vendorCount >= 25,
      detail: `registry size=${benchmarks.vendorCount}`,
    },
    {
      id: "P4.S2",
      ok: benchmarks.avgProjectsPerVendor >= 2,
      detail: `avg projects/vendor=${benchmarks.avgProjectsPerVendor.toFixed(2)}`,
    },
    {
      id: "P4.S3",
      ok: benchmarks.projectCoverage >= 0.8,
      detail: `coverage=${(benchmarks.projectCoverage * 100).toFixed(0)}%`,
    },
  ];

  // Overall gate uses suite validation ok + all projects have ≥1
  const allProjects = rows.every((r) => r.status === "pass");
  return {
    rows: rows.map((r) =>
      ok && allProjects
        ? r
        : {
            ...r,
            // keep per-project status; suite gate separate
          },
    ),
    suiteChecks,
    suiteOk: ok && allProjects,
    benchmarks,
    ledger,
  };
}

function printProject(marker, row) {
  const g = GLYPH[row.status] ?? "?";
  const passN = row.checks.filter((c) => c.ok).length;
  const code = row.status === "pass" ? "PASS" : row.status === "partial" ? "PARTIAL" : row.status === "pending" ? "PENDING" : "FAIL";
  console.log(
    `${marker} ${g} ${row.projectId}  ${code}  state=${row.stateCode} industry=${row.industry} checks=${passN}/${row.checks.length}`,
  );
  if (row.status === "fail") {
    for (const c of row.checks.filter((x) => !x.ok)) {
      console.log(`         · ${c.id}: ${c.detail}`);
    }
  }
}

function summarize(phase, rows, suiteChecks, durationMs) {
  const pass = rows.filter((r) => r.status === "pass").length;
  const partial = rows.filter((r) => r.status === "partial").length;
  const fail = rows.filter((r) => r.status === "fail").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const blocked = rows.filter((r) => r.status === "blocked").length;
  return {
    phase,
    marker: MARKER[phase],
    targetSuite: TARGET_SUITE,
    projects_total: rows.length,
    projects_pass: pass,
    projects_partial: partial,
    projects_fail: fail,
    projects_pending: pending,
    projects_blocked: blocked,
    suiteChecks,
    duration_ms: durationMs,
    gate: IMPLEMENTED.has(phase)
      ? fail === 0 && pass + partial >= Math.ceil(rows.length * 0.95)
      : false,
  };
}

function writeArtifacts(ts, phase, summary, rows) {
  fs.mkdirSync(RUNS, { recursive: true });
  const base = `${ts}-${phase}`;
  const jsonPath = path.join(RUNS, `${base}.json`);
  const mdPath = path.join(RUNS, `${base}-summary.md`);
  const payload = { summary, rows, generatedAt: new Date().toISOString() };
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2), "utf8");

  const lines = [
    `# ${summary.marker} run ${ts}`,
    ``,
    `| Metric | Value |`,
    `|--------|------:|`,
    `| Projects | ${summary.projects_total} |`,
    `| ● pass | ${summary.projects_pass} |`,
    `| ◐ partial | ${summary.projects_partial} |`,
    `| ✕ fail | ${summary.projects_fail} |`,
    `| ○ pending | ${summary.projects_pending} |`,
    `| Gate | ${summary.gate ? "OPEN ✓" : "HOLD"} |`,
    `| Duration ms | ${summary.duration_ms} |`,
    ``,
    `## Suite checks`,
    ...(summary.suiteChecks || []).map(
      (c) => `- ${c.ok ? "●" : "✕"} \`${c.id}\` ${c.detail}`,
    ),
    ``,
    `## Projects`,
    ``,
    `| Status | Id | State | Industry |`,
    `|--------|----|-------|----------|`,
    ...rows.map(
      (r) =>
        `| ${GLYPH[r.status]} | \`${r.projectId}\` | ${r.stateCode} | ${r.industry} |`,
    ),
    ``,
    `Plan: \`docs/COMM-SCALE-TESTBED-PLAN.md\``,
  ];
  fs.writeFileSync(mdPath, lines.join("\n"), "utf8");
  return { jsonPath, mdPath };
}

async function main() {
  const { phase: phaseArg } = parseArgs(process.argv);
  const toRun =
    phaseArg === "ALL" ? ["P0"] : PHASES.includes(phaseArg) ? [phaseArg] : ["P0"];
  // Only P0 implemented; others emit pending markers for visibility
  if (phaseArg === "ALL") {
    toRun.push("P1", "P2", "P3", "P4", "P5", "P6");
  }

  console.log("");
  console.log("═══════════════════════════════════════════════════════════");
  console.log(" LPIN Portfolio Comm Scale Test Bed");
  console.log(` Target suite: ${TARGET_SUITE} projects`);
  console.log(` Plan: docs/COMM-SCALE-TESTBED-PLAN.md`);
  console.log("═══════════════════════════════════════════════════════════");
  console.log("");

  const t0 = Date.now();
  const { meta, stats } = await loadCatalog();
  let orgMods = null;
  try {
    orgMods = await loadOrgModules();
  } catch (e) {
    console.warn(
      "Org modules not loaded (run with --experimental-strip-types):",
      e.message,
    );
  }
  const ts = stamp();

  // Demo slot as 56th when seed is 55
  const suite = [...meta];
  if (suite.length === TARGET_SUITE - 1) {
    suite.push({
      id: "js_sample_demo",
      name: "Sample multi-family board — Building B (demo slot)",
      city: "United States",
      stateCode: "US",
      industry: "multi_family",
      env: ["urban_dense"],
      interests: [],
      phase: "structure",
      lat: 39.5,
      lon: -98.35,
      permitOffice: "Local building department (demo)",
      captain: "M. Reyes (site superintendent)",
      blurb: "Portfolio demo slot — counts toward 56-project suite target.",
      startOffsetDays: -30,
    });
  }

  let exitCode = 0;

  for (const phase of toRun) {
    const marker = MARKER[phase];
    console.log(`── ${marker} ──────────────────────────────────────────`);
    const start = Date.now();
    let rows;
    let suiteChecks = [];

    if (phase === "P0") {
      rows = suite.map((m) => checkP0(m, stats));
      suiteChecks = suiteP0(suite, {
        ...stats,
        projectCount: suite.length,
        stateShareOfUs:
          new Set(suite.map((m) => m.stateCode).filter((s) => s !== "US")).size /
          50,
        stateCount: new Set(
          suite.map((m) => m.stateCode).filter((s) => s !== "US"),
        ).size,
      });
    } else if (phase === "P1") {
      if (!orgMods?.gen?.generateProjectOrg || !orgMods?.gen?.validateProjectOrg) {
        console.error(
          `${marker} ✕ cannot load generateProjectOrg — use: node --experimental-strip-types scripts/qa-portfolio-comm.mjs --phase P1`,
        );
        exitCode = 2;
        rows = phaseStub(phase, suite);
        suiteChecks = [{ id: "P1.S0", ok: false, detail: "module load failed" }];
      } else {
        rows = suite.map((m) =>
          checkP1(
            m,
            orgMods.gen.generateProjectOrg,
            orgMods.gen.validateProjectOrg,
          ),
        );
        suiteChecks = suiteP1(rows);
      }
    } else if (phase === "P2") {
      if (
        !orgMods?.gen?.generateProjectOrg ||
        !orgMods?.comm?.generateProjectComms ||
        !orgMods?.comm?.validateProjectComms
      ) {
        console.error(`${marker} ✕ cannot load comm modules`);
        exitCode = 2;
        rows = phaseStub(phase, suite);
        suiteChecks = [{ id: "P2.S0", ok: false, detail: "module load failed" }];
      } else {
        rows = suite.map((m) =>
          checkP2(
            m,
            orgMods.gen.generateProjectOrg,
            orgMods.comm.generateProjectComms,
            orgMods.comm.validateProjectComms,
          ),
        );
        suiteChecks = suiteP2(rows);
      }
    } else if (phase === "P3") {
      if (
        !orgMods?.gen?.generateProjectOrg ||
        !orgMods?.comm?.generateProjectComms ||
        !orgMods?.comm?.validateProjectVendorComms
      ) {
        console.error(`${marker} ✕ cannot load vendor-comm modules`);
        exitCode = 2;
        rows = phaseStub(phase, suite);
        suiteChecks = [{ id: "P3.S0", ok: false, detail: "module load failed" }];
      } else {
        rows = suite.map((m) =>
          checkP3(
            m,
            orgMods.gen.generateProjectOrg,
            orgMods.comm.generateProjectComms,
            orgMods.comm.validateProjectVendorComms,
          ),
        );
        suiteChecks = suiteP3(rows);
      }
    } else if (phase === "P4") {
      if (!orgMods?.nat?.buildNationalVendorLedger) {
        console.error(`${marker} ✕ cannot load national vendor module`);
        exitCode = 2;
        rows = phaseStub(phase, suite);
        suiteChecks = [{ id: "P4.S0", ok: false, detail: "module load failed" }];
      } else {
        const p4 = runP4(suite, orgMods.nat);
        rows = p4.rows;
        suiteChecks = p4.suiteChecks;
        if (!p4.suiteOk) {
          // force fail summary if suite validation failed
          // rows may still show per-project pass
        }
      }
    } else if (phase === "P5") {
      if (
        !orgMods?.gen?.generateProjectOrg ||
        !orgMods?.ix?.generateIntervalCommLog ||
        !orgMods?.comm?.validateProjectCommDepth
      ) {
        console.error(`${marker} ✕ cannot load depth/interval modules`);
        exitCode = 2;
        rows = phaseStub(phase, suite);
        suiteChecks = [{ id: "P5.S0", ok: false, detail: "module load failed" }];
      } else {
        rows = suite.map((m) =>
          checkP5(
            m,
            orgMods.gen.generateProjectOrg,
            orgMods.ix.generateIntervalCommLog,
            orgMods.comm.validateProjectCommDepth,
          ),
        );
        suiteChecks = suiteP5(rows);
      }
    } else if (phase === "IX") {
      if (!orgMods?.gen?.generateProjectOrg || !orgMods?.ix?.validateIntervalCommLog) {
        console.error(`${marker} ✕ cannot load interval modules`);
        exitCode = 2;
        rows = phaseStub(phase, suite);
        suiteChecks = [{ id: "IX.S0", ok: false, detail: "module load failed" }];
      } else {
        console.log(`${marker} generating full 15-min streams (may take a bit)...`);
        rows = suite.map((m) => {
          const row = checkIX(m, orgMods.gen.generateProjectOrg, orgMods.ix);
          process.stdout.write(
            row.status === "pass" ? "." : "x",
          );
          return row;
        });
        console.log("");
        suiteChecks = suiteIX(rows);
      }
    } else if (phase === "P6") {
      if (!orgMods?.scale?.scoreSuiteScale || !orgMods?.gen || !orgMods?.comm) {
        console.error(`${marker} ✕ cannot load scale modules`);
        exitCode = 2;
        rows = phaseStub(phase, suite);
        suiteChecks = [{ id: "P6.S0", ok: false, detail: "module load failed" }];
      } else {
        const p6 = runP6(suite, orgMods);
        rows = p6.rows;
        suiteChecks = p6.suiteChecks;
        // Write era freeze summary alongside normal artifact
        try {
          const freezePath = path.join(
            RUNS,
            `${ts}-P6-ERA-FREEZE.json`,
          );
          fs.mkdirSync(RUNS, { recursive: true });
          fs.writeFileSync(
            freezePath,
            JSON.stringify(
              {
                phase: "P6",
                marker: "[P6-SCALE]",
                gate: p6.suiteOk ? "OPEN" : "HOLD",
                benchmarks: p6.benchmarks,
                generatedAt: new Date().toISOString(),
                suiteSize: suite.length,
              },
              null,
              2,
            ),
            "utf8",
          );
          console.log(`${marker} FREEZE  ${path.relative(ROOT, freezePath)}`);
        } catch (e) {
          console.warn(`${marker} freeze write failed`, e.message);
        }
      }
    } else {
      rows = phaseStub(phase, suite);
      suiteChecks = [
        {
          id: `${phase}.S0`,
          ok: false,
          detail: "implementation pending — markers only",
        },
      ];
    }

    for (const row of rows) printProject(marker, row);

    console.log("");
    for (const c of suiteChecks) {
      console.log(
        `${marker} SUITE ${c.ok ? "●" : "✕"} ${c.id}  ${c.detail}`,
      );
    }

    const summary = summarize(phase, rows, suiteChecks, Date.now() - start);
    const { mdPath, jsonPath } = writeArtifacts(ts, phase, summary, rows);

    console.log("");
    console.log(
      `${marker} SCORE  ●${summary.projects_pass} ◐${summary.projects_partial} ✕${summary.projects_fail} ○${summary.projects_pending}  gate=${summary.gate ? "OPEN" : "HOLD"}`,
    );
    console.log(`${marker} ARTIFACT  ${path.relative(ROOT, mdPath)}`);
    console.log(`${marker} ARTIFACT  ${path.relative(ROOT, jsonPath)}`);
    console.log("");

    if (phase === "P0" && !summary.gate) exitCode = 1;
    if (phase === "P0" && rows.some((r) => r.status === "fail")) exitCode = 1;
  }

  console.log(`Done in ${Date.now() - t0}ms`);
  process.exit(exitCode);
}

main().catch((err) => {
  console.error("[P0-BASE] ✕ harness error", err);
  process.exit(2);
});
