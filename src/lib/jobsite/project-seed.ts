/**
 * Hydrate catalog rows into full Jobsite boards + built-in cross-project lists.
 */

import { applyIndustryTemplate } from "./apply-template";
import { buildCatalogMeta, PROJECT_SEED_VERSION } from "./project-catalog";
import { generateProjectComms } from "./project-comm-generate";
import { generateIntervalCommLog } from "./project-comm-interval";
import {
  buildNationalVendorLedger,
  nationalVendorsForProject,
} from "./project-national-vendors";
import { generateProjectOrg } from "./project-org-generate";
import { allowIntervalFieldLogSeed } from "./release-mode";
import type {
  EnvCondition,
  InterestTag,
  PortfolioState,
  ProjectList,
  ProjectMeta,
} from "./project-types";
import type {
  ConstructionIndustry,
  FieldReport,
  Inspection,
  Jobsite,
  Priority,
  ReportCategory,
} from "./types";

function ymdOffset(days: number): string {
  const dt = new Date(Date.now() + days * 86400_000);
  const y = dt.getFullYear();
  const m = String(dt.getMonth() + 1).padStart(2, "0");
  const day = String(dt.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

function envRisk(
  env: EnvCondition[],
): { title: string; body: string; category: ReportCategory; priority: Priority } {
  if (env.includes("coastal_hurricane") || env.includes("high_wind_plain")) {
    return {
      title: "Wind hold on exterior picks",
      body: "Sustained winds above site threshold. Exterior glazing / panel picks on hold until the window reopens. Sequence interior work only.",
      category: "weather",
      priority: "P1",
    };
  }
  if (
    env.includes("freeze_thaw") ||
    env.includes("cold_winter") ||
    env.includes("permafrost_edge")
  ) {
    return {
      title: "Cold-weather concrete protection",
      body: "Forecast overnight lows below placement plan. Blankets and heaters staged; QA needs recorded temps before next pour.",
      category: "materials",
      priority: "P1",
    };
  }
  if (env.includes("wetland_swq") || env.includes("coastal_flood")) {
    return {
      title: "Stormwater BMP silt load after rain",
      body: "Inlet protection and silt fence need reset before the next inspection window. Standing water on access lane.",
      category: "permit",
      priority: "P0",
    };
  }
  if (env.includes("seismic")) {
    return {
      title: "Special inspection — structural steel hold",
      body: "Special inspector noted incomplete weld documentation on brace frame. Do not cover until cleared.",
      category: "inspection",
      priority: "P1",
    };
  }
  if (env.includes("wildfire_wui")) {
    return {
      title: "WUI hardening materials short",
      body: "Ignition-resistant siding short by one truck. Envelope crew can finish non-exposed elevations only.",
      category: "materials",
      priority: "P2",
    };
  }
  if (env.includes("desert_heat")) {
    return {
      title: "Heat protocol — crew rotation",
      body: "Heat index above site plan. Exterior roof work shifted to night window; hydration stations restocked.",
      category: "safety",
      priority: "P1",
    };
  }
  return {
    title: "Coordination gap on trade stacking",
    body: "Two trades requested the same zone tomorrow. Need board decision before 3 PM.",
    category: "other",
    priority: "P2",
  };
}

function phaseInspection(meta: ProjectMeta): Inspection {
  const map: Record<ProjectMeta["phase"], string> = {
    precon: "Pre-construction / plan review coordination",
    foundation: "Foundation / footing inspection",
    structure: "Structural frame inspection",
    envelope: "Building envelope / weather barrier",
    mep: "MEP rough-in inspection",
    finish: "Final / life-safety walk",
    closeout: "Certificate of occupancy walk",
  };
  const status =
    meta.phase === "precon" ? ("requested" as const) : ("scheduled" as const);
  return {
    id: `insp_${meta.id}`,
    typeLabel: map[meta.phase],
    scheduledDate: ymdOffset(meta.phase === "closeout" ? 3 : 7),
    timeWindow: "08:00–12:00",
    buildingArea: "Primary work zone",
    status,
    requestedBy: meta.captain,
    notes: `Seed inspection for ${meta.phase} phase — synthetic board data.`,
    authorityOffice: meta.permitOffice,
    createdAt: hoursAgo(48),
    updatedAt: hoursAgo(12),
  };
}

export function metaToJobsite(
  meta: ProjectMeta,
  opts?: {
    nationalVendors?: Jobsite["nationalVendors"];
  },
): Jobsite {
  const slugHash = [...meta.id].reduce((a, c) => a + c.charCodeAt(0), 0);
  const start = ymdOffset(meta.startOffsetDays);
  const risk = envRisk(meta.env);
  const report: FieldReport = {
    id: `fr_${meta.id}_1`,
    title: risk.title,
    body: risk.body,
    priority: risk.priority,
    urgency: risk.priority === "P0" ? "immediate" : "today",
    category: risk.category,
    authorRole: "field",
    authorName: meta.captain,
    status: "open",
    createdAt: hoursAgo(4 + (slugHash % 30)),
    sendToAuthority:
      risk.category === "permit" || risk.category === "inspection",
  };

  let jobsite: Jobsite = {
    id: meta.id,
    name: meta.name,
    location: `${meta.city}, ${meta.stateCode}, United States`,
    cityState: `${meta.city}, ${meta.stateCode}`,
    permitNumber: `BP-2026-${String(10000 + (slugHash % 80000))}`,
    permittingOffice: meta.permitOffice,
    country: "US",
    stateCode: meta.stateCode,
    isDemo: true,
    industry: meta.industry,
    projectStartDate: start,
    materialsBudget: meta.materialsBudget,
    captainName: meta.captain,
    notes: [
      meta.blurb,
      `Env: ${meta.env.join(", ")}`,
      `Interests: ${meta.interests.join(", ")}`,
      "Synthetic portfolio project — local baseline only.",
    ].join("\n"),
    updatedAt: new Date().toISOString(),
    siteGeo: {
      version: 1,
      pin: { lat: meta.lat, lon: meta.lon },
      zoom: 13,
      layers: [],
      locateQuery: `${meta.city}, ${meta.stateCode}`,
    },
    org: generateProjectOrg(meta),
    reports: [report],
    messages: [],
    inspections: [phaseInspection(meta)],
    contacts: [],
    schedule: [],
    materials: [],
    dailyLogs: [],
    punchList: [],
    changeOrders: [],
  };

  const org = jobsite.org ?? generateProjectOrg(meta);
  const nationals = opts?.nationalVendors;
  // D1: IX-15M densify only when lab scale flag is on (never public product default)
  const fieldComms = allowIntervalFieldLogSeed()
    ? generateIntervalCommLog(
        {
          id: meta.id,
          name: meta.name,
          stateCode: meta.stateCode,
          city: meta.city,
          industry: meta.industry,
          env: meta.env,
          blurb: meta.blurb,
          projectStartDate: start,
          nationalVendorIds: nationals?.map((n) => n.id),
        },
        org,
      )
    : generateProjectComms(
        {
          id: meta.id,
          name: meta.name,
          stateCode: meta.stateCode,
          city: meta.city,
          industry: meta.industry,
          env: meta.env,
          blurb: meta.blurb,
        },
        org,
      );
  jobsite = {
    ...jobsite,
    org,
    nationalVendors: nationals,
    fieldComms: fieldComms as Jobsite["fieldComms"],
  };

  try {
    jobsite = applyIndustryTemplate(jobsite, meta.industry, start, {
      replaceSchedule: true,
      replaceMaterials: true,
    });
    jobsite = {
      ...jobsite,
      isDemo: true,
      id: meta.id,
      name: meta.name,
      org: jobsite.org ?? org,
      nationalVendors: jobsite.nationalVendors,
      fieldComms: jobsite.fieldComms,
    };
  } catch {
    /* templates optional */
  }
  return jobsite;
}

export function buildBuiltInLists(meta: ProjectMeta[]): ProjectList[] {
  const now = new Date().toISOString();
  const byIndustry = (
    industry: ConstructionIndustry,
    name: string,
    description: string,
  ): ProjectList => ({
    id: `list_ind_${industry}`,
    name,
    description,
    projectIds: meta.filter((m) => m.industry === industry).map((m) => m.id),
    match: { industries: [industry] },
    builtIn: true,
    updatedAt: now,
  });

  const byInterest = (
    tag: InterestTag,
    name: string,
    description: string,
  ): ProjectList => ({
    id: `list_int_${tag}`,
    name,
    description,
    projectIds: meta.filter((m) => m.interests.includes(tag)).map((m) => m.id),
    match: { interests: [tag] },
    builtIn: true,
    updatedAt: now,
  });

  const byEnv = (
    env: EnvCondition,
    name: string,
    description: string,
  ): ProjectList => ({
    id: `list_env_${env}`,
    name,
    description,
    projectIds: meta.filter((m) => m.env.includes(env)).map((m) => m.id),
    match: { env: [env] },
    builtIn: true,
    updatedAt: now,
  });

  return [
    byIndustry(
      "multi_family",
      "Template · Multi-family peers",
      "All multi-family boards for cross-monitor compare.",
    ),
    byIndustry(
      "healthcare",
      "Template · Healthcare / ICRA",
      "Healthcare projects sharing infection-control interests.",
    ),
    byIndustry(
      "civil",
      "Template · Civil / utilities",
      "Civil and site infrastructure peers.",
    ),
    byIndustry(
      "industrial",
      "Template · Industrial / logistics",
      "Warehouses, process, and logistics shells.",
    ),
    byIndustry(
      "hospitality",
      "Template · Hospitality FF&E",
      "Hotels and guest-experience boards.",
    ),
    byInterest(
      "stormwater",
      "Shared · Stormwater / SWQ",
      "Projects with stormwater interest tags.",
    ),
    byInterest(
      "life_safety",
      "Shared · Life safety",
      "Boards tagged for life-safety focus.",
    ),
    byInterest("high_rise", "Shared · High-rise", "Vertical construction peers."),
    byInterest(
      "occupied_site",
      "Shared · Occupied sites",
      "TI / live-environment projects.",
    ),
    byEnv("seismic", "Env · Seismic regions", "Projects with seismic environmental conditions."),
    byEnv(
      "cold_winter",
      "Env · Cold-winter builds",
      "Deep cold / freeze construction peers.",
    ),
    byEnv(
      "coastal_hurricane",
      "Env · Hurricane coast",
      "Coastal hurricane wind boards.",
    ),
    byEnv(
      "tornado_alley",
      "Env · Tornado / severe wind",
      "Plains severe-wind projects.",
    ),
    {
      id: "list_west_coast",
      name: "Region · Pacific & Southwest",
      description: "CA, OR, WA, NV, AZ, NM, UT, CO, HI, AK, ID, MT",
      projectIds: meta
        .filter((m) =>
          [
            "CA",
            "OR",
            "WA",
            "NV",
            "AZ",
            "NM",
            "UT",
            "CO",
            "HI",
            "AK",
            "ID",
            "MT",
          ].includes(m.stateCode),
        )
        .map((m) => m.id),
      match: {
        stateCodes: [
          "CA",
          "OR",
          "WA",
          "NV",
          "AZ",
          "NM",
          "UT",
          "CO",
          "HI",
          "AK",
          "ID",
          "MT",
        ],
      },
      builtIn: true,
      updatedAt: now,
    },
    {
      id: "list_custom_starter",
      name: "My compare set (editable)",
      description:
        "Start here — pin projects you want side-by-side across monitors.",
      projectIds: meta.slice(0, 4).map((m) => m.id),
      builtIn: false,
      updatedAt: now,
    },
  ];
}

export function createSeedPortfolio(preferActiveId?: string): PortfolioState {
  const metaList = buildCatalogMeta();
  // Cross-project national vendor ledger (P4) — built once, attached per board
  const nationalLedger = buildNationalVendorLedger(
    metaList.map((m) => ({
      id: m.id,
      name: m.name,
      stateCode: m.stateCode,
      industry: m.industry,
      env: m.env,
      interests: m.interests,
    })),
  );

  const meta: Record<string, ProjectMeta> = {};
  const projects: Record<string, Jobsite> = {};
  for (const m of metaList) {
    meta[m.id] = m;
    projects[m.id] = metaToJobsite(m, {
      nationalVendors: nationalVendorsForProject(m.id, nationalLedger),
    });
  }
  const lists = buildBuiltInLists(metaList);
  const activeProjectId =
    preferActiveId && projects[preferActiveId]
      ? preferActiveId
      : (metaList[0]?.id ?? "js_sample_demo");

  return {
    version: 1,
    projects,
    meta,
    lists,
    activeProjectId,
    seedVersion: PROJECT_SEED_VERSION,
    updatedAt: new Date().toISOString(),
  };
}
