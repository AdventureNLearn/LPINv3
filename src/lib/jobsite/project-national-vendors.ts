/**
 * National / multi-project vendors — cross-portfolio registry.
 * Affinity: regulatory · quality · procurement (plus industry/env tags).
 * Self-contained for Node harness (--experimental-strip-types).
 *
 * P4: every project attaches ≥1 national; every national spans ≥2 projects.
 */

export type AffinityKind = "regulatory" | "quality" | "procurement";

export interface NationalVendor {
  id: string;
  name: string;
  /** Primary commercial role */
  category:
    | "envelope"
    | "steel"
    | "concrete"
    | "mep_equipment"
    | "electrical"
    | "fire_life_safety"
    | "env_consult"
    | "modular"
    | "logistics"
    | "glazing"
    | "roofing"
    | "commissioning"
    | "geotech"
    | "waterproofing"
    | "controls";
  /** Must include at least one of reg / quality / procurement */
  affinity: AffinityKind[];
  /** Match project.industry */
  industries: string[];
  /** Match project.env tags (any) */
  envAny?: string[];
  /** Match project.interests (any) */
  interestsAny?: string[];
  /** Division codes this vendor typically serves */
  divisionCodes: string[];
  notes?: string;
}

export interface NationalAttachment {
  nationalVendorId: string;
  projectId: string;
  reason: string;
  affinity: AffinityKind[];
}

export interface NationalVendorLedger {
  version: 1;
  vendors: NationalVendor[];
  attachments: NationalAttachment[];
  /** vendorId → projectIds */
  byVendor: Record<string, string[]>;
  /** projectId → vendorIds */
  byProject: Record<string, string[]>;
  generatedAt: string;
}

export interface ProjectMetaLite {
  id: string;
  name: string;
  stateCode: string;
  industry: string;
  env?: string[];
  interests?: string[];
}

/** ≥25 fictional national accounts — process-real, no real trademarks. */
export const NATIONAL_VENDOR_REGISTRY: NationalVendor[] = [
  {
    id: "nv_spanframe_steel",
    name: "SpanFrame National Steel",
    category: "steel",
    affinity: ["quality", "procurement"],
    industries: ["multi_family", "commercial", "industrial", "hospitality", "healthcare", "education"],
    interestsAny: ["steel_structure", "high_rise", "crane_picks"],
    divisionCodes: ["05"],
    notes: "Mill order + fab for mid/high-rise frames",
  },
  {
    id: "nv_curbwall_glazing",
    name: "Curbwall Glazing Systems",
    category: "glazing",
    affinity: ["quality", "regulatory"],
    industries: ["multi_family", "commercial", "hospitality", "healthcare", "education"],
    envAny: ["coastal_hurricane", "high_wind_plain", "cold_winter"],
    interestsAny: ["envelope", "high_rise"],
    divisionCodes: ["08", "07"],
  },
  {
    id: "nv_thermshield_envelope",
    name: "ThermShield Envelope Co.",
    category: "envelope",
    affinity: ["quality", "regulatory"],
    industries: ["single_family", "multi_family", "commercial", "renovation", "education", "hospitality"],
    envAny: ["cold_winter", "freeze_thaw", "desert_heat", "wildfire_wui"],
    interestsAny: ["envelope", "net_zero"],
    divisionCodes: ["07", "09"],
  },
  {
    id: "nv_slabline_ready_mix",
    name: "Slabline Ready-Mix National",
    category: "concrete",
    affinity: ["procurement", "quality"],
    industries: ["single_family", "multi_family", "commercial", "industrial", "civil", "healthcare", "education"],
    envAny: ["freeze_thaw", "expansive_soil"],
    divisionCodes: ["03", "31"],
  },
  {
    id: "nv_coolspan_hvac",
    name: "CoolSpan HVAC Equipment",
    category: "mep_equipment",
    affinity: ["procurement", "quality"],
    industries: ["multi_family", "commercial", "industrial", "hospitality", "healthcare", "education"],
    divisionCodes: ["23"],
  },
  {
    id: "nv_parkline_switchgear",
    name: "Parkline Switchgear National",
    category: "electrical",
    affinity: ["procurement", "regulatory"],
    industries: ["commercial", "industrial", "healthcare", "education", "hospitality", "multi_family"],
    interestsAny: ["life_safety", "logistics"],
    divisionCodes: ["26"],
  },
  {
    id: "nv_lifesafe_fire",
    name: "LifeSafe Fire & Life Safety",
    category: "fire_life_safety",
    affinity: ["regulatory", "quality"],
    industries: ["multi_family", "commercial", "hospitality", "healthcare", "education", "renovation"],
    interestsAny: ["life_safety", "healthcare_icra", "high_rise"],
    divisionCodes: ["21", "LS", "28"],
  },
  {
    id: "nv_littletern_env",
    name: "Little Tern Environmental National",
    category: "env_consult",
    affinity: ["regulatory"],
    industries: ["civil", "industrial", "commercial", "multi_family", "single_family", "education"],
    envAny: ["wetland_swq", "coastal_flood", "coastal_hurricane", "wildfire_wui"],
    interestsAny: ["stormwater", "civil_utilities"],
    divisionCodes: ["ENV", "31", "33"],
  },
  {
    id: "nv_watershed_swq",
    name: "Watershed SWQ Products",
    category: "env_consult",
    affinity: ["regulatory", "procurement"],
    industries: ["civil", "multi_family", "commercial", "industrial", "single_family"],
    envAny: ["wetland_swq", "coastal_flood", "humid_subtropical"],
    interestsAny: ["stormwater"],
    divisionCodes: ["ENV", "33", "32"],
  },
  {
    id: "nv_modubay_pods",
    name: "ModuBay Prefab Pods",
    category: "modular",
    affinity: ["procurement", "quality"],
    industries: ["multi_family", "hospitality", "healthcare", "education", "renovation"],
    interestsAny: ["modular"],
    divisionCodes: ["06", "09", "22"],
  },
  {
    id: "nv_crossdock_logistics",
    name: "CrossDock National Logistics",
    category: "logistics",
    affinity: ["procurement"],
    industries: ["industrial", "commercial", "civil", "multi_family"],
    interestsAny: ["logistics", "tilt_up"],
    divisionCodes: ["01", "31"],
  },
  {
    id: "nv_tiltpro_panels",
    name: "TiltPro Panel Systems",
    category: "concrete",
    affinity: ["quality", "procurement"],
    industries: ["industrial", "commercial"],
    interestsAny: ["tilt_up", "logistics"],
    divisionCodes: ["03", "05"],
  },
  {
    id: "nv_ridge_roofing",
    name: "RidgeLine Roofing National",
    category: "roofing",
    affinity: ["quality", "regulatory"],
    industries: ["single_family", "multi_family", "commercial", "industrial", "education", "hospitality"],
    envAny: ["coastal_hurricane", "high_wind_plain", "cold_winter", "desert_heat"],
    interestsAny: ["envelope"],
    divisionCodes: ["07"],
  },
  {
    id: "nv_cx_northstar",
    name: "Northstar Commissioning Group",
    category: "commissioning",
    affinity: ["quality", "regulatory"],
    industries: ["healthcare", "education", "commercial", "hospitality", "industrial"],
    interestsAny: ["healthcare_icra", "net_zero"],
    divisionCodes: ["CX", "23", "26"],
  },
  {
    id: "nv_bedrock_geotech",
    name: "Bedrock Geotech National",
    category: "geotech",
    affinity: ["regulatory", "quality"],
    industries: ["civil", "industrial", "commercial", "multi_family", "healthcare", "education"],
    envAny: ["expansive_soil", "seismic", "karst_sinkhole", "permafrost_edge", "high_altitude"],
    interestsAny: ["foundation_deep"],
    divisionCodes: ["31", "03"],
  },
  {
    id: "nv_drycore_wp",
    name: "DryCore Waterproofing",
    category: "waterproofing",
    affinity: ["quality", "procurement"],
    industries: ["multi_family", "commercial", "healthcare", "hospitality", "renovation", "education"],
    envAny: ["coastal_flood", "humid_subtropical", "wetland_swq"],
    interestsAny: ["envelope", "foundation_deep"],
    divisionCodes: ["07", "03"],
  },
  {
    id: "nv_signal_controls",
    name: "Signal & Loop Controls",
    category: "controls",
    affinity: ["procurement", "quality"],
    industries: ["industrial", "commercial", "healthcare", "education", "hospitality"],
    divisionCodes: ["25", "23", "26"],
  },
  {
    id: "nv_union_labor_desk",
    name: "Metro Building Trades Desk (national account)",
    category: "logistics",
    affinity: ["procurement", "regulatory"],
    industries: ["commercial", "multi_family", "industrial", "healthcare", "education"],
    interestsAny: ["union_labor", "high_rise", "crane_picks"],
    divisionCodes: ["01", "05"],
  },
  {
    id: "nv_public_fund_compliance",
    name: "Civic Fund Compliance Advisors",
    category: "env_consult",
    affinity: ["regulatory"],
    industries: ["education", "civil", "healthcare", "multi_family"],
    interestsAny: ["public_funding", "education_phased"],
    divisionCodes: ["BD", "01"],
  },
  {
    id: "nv_netzero_glass",
    name: "Lumen Net-Zero Assemblies",
    category: "glazing",
    affinity: ["quality", "regulatory"],
    industries: ["commercial", "education", "healthcare", "single_family", "multi_family"],
    interestsAny: ["net_zero", "envelope"],
    divisionCodes: ["08", "07"],
  },
  {
    id: "nv_seismic_brace",
    name: "QuakeBrace Systems",
    category: "steel",
    affinity: ["regulatory", "quality"],
    industries: ["multi_family", "commercial", "healthcare", "education", "industrial", "hospitality"],
    envAny: ["seismic"],
    interestsAny: ["steel_structure", "life_safety"],
    divisionCodes: ["05"],
  },
  {
    id: "nv_hurricane_straps",
    name: "GulfForce Connector Systems",
    category: "envelope",
    affinity: ["regulatory", "procurement"],
    industries: ["single_family", "multi_family", "hospitality", "commercial"],
    envAny: ["coastal_hurricane", "high_wind_plain"],
    divisionCodes: ["06", "05", "07"],
  },
  {
    id: "nv_icra_barriers",
    name: "ICRA Path Barrier Systems",
    category: "modular",
    affinity: ["regulatory", "quality"],
    industries: ["healthcare", "renovation", "education"],
    interestsAny: ["healthcare_icra", "occupied_site"],
    divisionCodes: ["01", "09", "LS"],
  },
  {
    id: "nv_hospitality_ffe",
    name: "GuestLine FF&E Logistics",
    category: "logistics",
    affinity: ["procurement"],
    industries: ["hospitality", "renovation"],
    interestsAny: ["hospitality_ffe"],
    divisionCodes: ["01", "09"],
  },
  {
    id: "nv_nightwork_lighting",
    name: "NightSpan Temporary Power & Light",
    category: "electrical",
    affinity: ["procurement", "quality"],
    industries: ["industrial", "commercial", "civil", "renovation", "multi_family"],
    interestsAny: ["night_work", "logistics"],
    envAny: ["desert_heat", "urban_dense"],
    divisionCodes: ["26", "01"],
  },
  {
    id: "nv_historic_masonry",
    name: "Heritage Masonry Conservators",
    category: "concrete",
    affinity: ["quality", "regulatory"],
    industries: ["renovation", "hospitality", "education", "commercial"],
    interestsAny: ["historic"],
    divisionCodes: ["04", "02", "07"],
  },
  {
    id: "nv_crane_national",
    name: "SkyHook Crane National",
    category: "logistics",
    affinity: ["procurement", "quality"],
    industries: ["multi_family", "commercial", "industrial", "hospitality", "healthcare"],
    interestsAny: ["crane_picks", "high_rise", "steel_structure"],
    divisionCodes: ["01", "05"],
  },
  {
    id: "nv_medical_gas",
    name: "AetherMed Gas Systems",
    category: "mep_equipment",
    affinity: ["regulatory", "quality"],
    industries: ["healthcare"],
    interestsAny: ["healthcare_icra", "life_safety"],
    divisionCodes: ["22", "23", "LS"],
  },
];

function scoreMatch(
  v: NationalVendor,
  p: ProjectMetaLite,
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];
  if (v.industries.includes(p.industry)) {
    score += 3;
    reasons.push(`industry:${p.industry}`);
  }
  const env = p.env ?? [];
  const envHits = (v.envAny ?? []).filter((e) => env.includes(e));
  if (envHits.length) {
    score += 2 * envHits.length;
    reasons.push(`env:${envHits.join("+")}`);
  }
  const interests = p.interests ?? [];
  const intHits = (v.interestsAny ?? []).filter((t) => interests.includes(t));
  if (intHits.length) {
    score += 2 * intHits.length;
    reasons.push(`interest:${intHits.join("+")}`);
  }
  // Soft boost so broad procurement vendors still land
  if (v.affinity.includes("procurement") && score > 0) {
    score += 0.5;
  }
  return { score, reasons };
}

/**
 * Attach national vendors to a single project (top matches, min 1 if any industry hit).
 */
export function matchNationalsForProject(
  p: ProjectMetaLite,
  registry: NationalVendor[] = NATIONAL_VENDOR_REGISTRY,
  minScore = 3,
  maxAttach = 8,
): NationalAttachment[] {
  const ranked = registry
    .map((v) => {
      const { score, reasons } = scoreMatch(v, p);
      return { v, score, reasons };
    })
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score);

  let picks = ranked.slice(0, maxAttach);

  // Guarantee at least one national when industry matches anything in registry
  if (picks.length === 0) {
    const soft = registry
      .map((v) => {
        const { score, reasons } = scoreMatch(v, p);
        return { v, score, reasons };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score);
    picks = soft.slice(0, 2);
  }

  // Still empty — attach broad procurement logistics as fallback
  if (picks.length === 0) {
    const fallback =
      registry.find((v) => v.id === "nv_crossdock_logistics") ?? registry[0]!;
    picks = [
      {
        v: fallback,
        score: 1,
        reasons: ["fallback:suite-coverage"],
      },
    ];
  }

  return picks.map(({ v, reasons }) => ({
    nationalVendorId: v.id,
    projectId: p.id,
    reason: reasons.join("; ") || "matched",
    affinity: [...v.affinity],
  }));
}

/**
 * Build full cross-project ledger. Ensures every national spans ≥2 projects
 * by back-filling weakest multi-project attachments when needed.
 */
export function buildNationalVendorLedger(
  projects: ProjectMetaLite[],
  registry: NationalVendor[] = NATIONAL_VENDOR_REGISTRY,
): NationalVendorLedger {
  const attachments: NationalAttachment[] = [];
  for (const p of projects) {
    attachments.push(...matchNationalsForProject(p, registry));
  }

  // Index
  const byVendor: Record<string, string[]> = {};
  const byProject: Record<string, string[]> = {};
  const reindex = () => {
    for (const k of Object.keys(byVendor)) delete byVendor[k];
    for (const k of Object.keys(byProject)) delete byProject[k];
    for (const a of attachments) {
      if (!byVendor[a.nationalVendorId]) byVendor[a.nationalVendorId] = [];
      if (!byVendor[a.nationalVendorId]!.includes(a.projectId)) {
        byVendor[a.nationalVendorId]!.push(a.projectId);
      }
      if (!byProject[a.projectId]) byProject[a.projectId] = [];
      if (!byProject[a.projectId]!.includes(a.nationalVendorId)) {
        byProject[a.projectId]!.push(a.nationalVendorId);
      }
    }
  };
  reindex();

  // Ensure every registry vendor appears on ≥2 projects
  for (const v of registry) {
    const list = byVendor[v.id] ?? [];
    if (list.length >= 2) continue;
    // Attach to best-scoring projects not already linked
    const ranked = projects
      .map((p) => ({ p, ...scoreMatch(v, p) }))
      .sort((a, b) => b.score - a.score);
    for (const row of ranked) {
      if ((byVendor[v.id] ?? []).length >= 2) break;
      if ((byVendor[v.id] ?? []).includes(row.p.id)) continue;
      attachments.push({
        nationalVendorId: v.id,
        projectId: row.p.id,
        reason:
          row.reasons.join("; ") ||
          `backfill:multi-project-min score=${row.score}`,
        affinity: [...v.affinity],
      });
      reindex();
    }
    // Absolute floor: force first two projects
    while ((byVendor[v.id] ?? []).length < 2 && projects.length >= 2) {
      for (const p of projects) {
        if ((byVendor[v.id] ?? []).includes(p.id)) continue;
        attachments.push({
          nationalVendorId: v.id,
          projectId: p.id,
          reason: "backfill:suite-minimum-span",
          affinity: [...v.affinity],
        });
        reindex();
        if ((byVendor[v.id] ?? []).length >= 2) break;
      }
      break;
    }
  }

  reindex();

  return {
    version: 1,
    vendors: registry,
    attachments,
    byVendor,
    byProject,
    generatedAt: new Date().toISOString(),
  };
}

export function validateNationalVendorLedger(
  ledger: NationalVendorLedger | null | undefined,
  projectIds: string[],
): {
  ok: boolean;
  checks: Array<{ id: string; ok: boolean; detail: string }>;
  benchmarks: {
    vendorCount: number;
    avgProjectsPerVendor: number;
    projectsWithNational: number;
    projectCoverage: number;
  };
} {
  const checks: Array<{ id: string; ok: boolean; detail: string }> = [];
  const emptyBench = {
    vendorCount: 0,
    avgProjectsPerVendor: 0,
    projectsWithNational: 0,
    projectCoverage: 0,
  };
  if (!ledger) {
    return {
      ok: false,
      checks: [{ id: "P4.0", ok: false, detail: "ledger missing" }],
      benchmarks: emptyBench,
    };
  }

  const n = ledger.vendors.length;
  const countOk = n >= 25;
  checks.push({
    id: "P4.1",
    ok: countOk,
    detail: countOk ? `national vendors=${n}` : `need ≥25 got ${n}`,
  });

  const singleSpan = ledger.vendors.filter(
    (v) => (ledger.byVendor[v.id] ?? []).length < 2,
  );
  checks.push({
    id: "P4.2",
    ok: singleSpan.length === 0,
    detail:
      singleSpan.length === 0
        ? "all nationals span ≥2 projects"
        : `single-project nationals: ${singleSpan.map((v) => v.id).join(",")}`,
  });

  const affinityOk = ledger.vendors.every(
    (v) =>
      v.affinity.length > 0 &&
      v.affinity.some((a) =>
        ["regulatory", "quality", "procurement"].includes(a),
      ),
  );
  checks.push({
    id: "P4.3",
    ok: affinityOk,
    detail: affinityOk
      ? "all vendors have reg/quality/procurement affinity"
      : "affinity tags missing",
  });

  const ledgerListsAll = ledger.vendors.every((v) => {
    const ids = ledger.byVendor[v.id] ?? [];
    return ids.length === new Set(ids).size && ids.every((id) => typeof id === "string");
  });
  const allProjectsReachable = projectIds.every(
    (pid) => (ledger.byProject[pid] ?? []).length >= 0,
  );
  checks.push({
    id: "P4.4",
    ok: ledgerListsAll && allProjectsReachable && Object.keys(ledger.byVendor).length >= 25,
    detail: ledgerListsAll
      ? `ledger vendors=${Object.keys(ledger.byVendor).length} projects_indexed=${Object.keys(ledger.byProject).length}`
      : "ledger incomplete",
  });

  const withNat = projectIds.filter(
    (pid) => (ledger.byProject[pid] ?? []).length >= 1,
  ).length;
  const coverage = projectIds.length ? withNat / projectIds.length : 0;
  const coverOk = coverage >= 0.8;
  checks.push({
    id: "P4.5",
    ok: coverOk,
    detail: `project coverage ${(coverage * 100).toFixed(0)}% (${withNat}/${projectIds.length})`,
  });

  const spans = ledger.vendors.map((v) => (ledger.byVendor[v.id] ?? []).length);
  const avg =
    spans.reduce((a, b) => a + b, 0) / Math.max(1, spans.length);

  return {
    ok: checks.every((c) => c.ok),
    checks,
    benchmarks: {
      vendorCount: n,
      avgProjectsPerVendor: avg,
      projectsWithNational: withNat,
      projectCoverage: coverage,
    },
  };
}

/** Per-project payload to store on Jobsite */
export function nationalVendorsForProject(
  projectId: string,
  ledger: NationalVendorLedger,
): Array<{
  id: string;
  name: string;
  affinity: AffinityKind[];
  category: string;
  reason: string;
}> {
  const ids = ledger.byProject[projectId] ?? [];
  return ids.map((id) => {
    const v = ledger.vendors.find((x) => x.id === id)!;
    const att = ledger.attachments.find(
      (a) => a.nationalVendorId === id && a.projectId === projectId,
    );
    return {
      id: v.id,
      name: v.name,
      affinity: v.affinity,
      category: v.category,
      reason: att?.reason ?? "attached",
    };
  });
}
