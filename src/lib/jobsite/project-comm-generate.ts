/**
 * Project field communications — division-categorized, phase-routed.
 * Pattern source: lpin-jobsite-chat-lab (ChatMessage + workflow routing).
 * Self-contained for Node harness (--experimental-strip-types).
 *
 * P2: every portfolio project gets a multi-division seed log.
 * P3 will tighten vendorId/contractId requirements further.
 */

/** Minimal org shape needed for comm generation (avoids relative imports). */
export interface CommOrgPerson {
  id: string;
  name: string;
  roleId: string;
}
export interface CommOrgDivision {
  code: string;
  leadId: string;
}
export interface CommOrgContract {
  id: string;
  vendorId: string;
  divisions: string[];
  name?: string;
  contractor?: string;
}
export interface CommOrgVendor {
  id: string;
  name: string;
  kind?: string;
  contractIds: string[];
  divisionCodes?: string[];
}
export interface CommOrg {
  people: CommOrgPerson[];
  divisions: CommOrgDivision[];
  contracts: CommOrgContract[];
  vendors?: CommOrgVendor[];
}

/** Divisions treated as trade traffic (must carry vendor + contract). */
export const TRADE_DIVISIONS = new Set([
  "02",
  "03",
  "04",
  "05",
  "06",
  "07",
  "08",
  "09",
  "21",
  "22",
  "23",
  "26",
  "27",
  "28",
  "31",
  "32",
  "33",
  "ENV",
  "LS",
  "CX",
]);

export function isTradeDivision(code: string): boolean {
  return TRADE_DIVISIONS.has(code);
}

export type CommKind =
  | "status_update"
  | "handoff"
  | "inspection_request"
  | "inspection_result"
  | "bd_lane"
  | "ack"
  | "escalation"
  | "pin_request"
  | "site_pack";

export type CommPhase =
  | "mobilization"
  | "walkdown"
  | "active_work"
  | "inspection"
  | "deficiency"
  | "resolution"
  | "closeout";

export type CommRoleId =
  | "super"
  | "foreman"
  | "crew"
  | "inspector"
  | "owner"
  | "bd"
  | "system";

export interface ProjectComm {
  id: string;
  projectId: string;
  kind: CommKind;
  phase: CommPhase;
  /** Primary CSI / lab division code (required P2) */
  division: string;
  /** Optional multi-scope tags (same codes as org divisions) */
  scopes?: string[];
  fromRole: CommRoleId;
  toRoles: CommRoleId[];
  fromName: string;
  toNames: string[];
  text: string;
  /** Linked when trade traffic (P3 will hard-require for trades) */
  contractId?: string;
  vendorId?: string;
  ackRequired?: boolean;
  acked?: boolean;
  programMonth?: number;
  createdAt: string;
  /** Set when routing rules fail */
  routingGap?: string;
}

export interface ProjectCommLog {
  version: 1 | 2;
  projectId: string;
  messages: ProjectComm[];
  generatedAt: string;
  mode?: string;
  fullMessageCount?: number;
  sampled?: boolean;
  sampleCap?: number;
  timeline?: Record<string, unknown>;
}

/** Phase → who must be on the wire (lab workflow.ts) */
export const PHASE_ROUTING: Record<
  CommPhase,
  { required: CommRoleId[]; optional: CommRoleId[]; defaultWindowMin: number }
> = {
  mobilization: {
    required: ["super", "foreman", "crew"],
    optional: ["owner"],
    defaultWindowMin: 240,
  },
  walkdown: {
    required: ["super", "foreman"],
    optional: ["crew", "owner"],
    defaultWindowMin: 60,
  },
  active_work: {
    required: ["foreman", "crew"],
    optional: ["super"],
    defaultWindowMin: 120,
  },
  inspection: {
    required: ["super", "inspector"],
    optional: ["owner", "bd"],
    defaultWindowMin: 180,
  },
  deficiency: {
    required: ["super", "foreman"],
    optional: ["crew", "inspector", "owner"],
    defaultWindowMin: 30,
  },
  resolution: {
    required: ["super", "foreman", "inspector"],
    optional: ["owner"],
    defaultWindowMin: 120,
  },
  closeout: {
    required: ["super", "owner"],
    optional: ["inspector", "bd"],
    defaultWindowMin: 480,
  },
};

export function routingGap(
  phase: CommPhase | undefined,
  toRoles: CommRoleId[] | undefined,
): string | undefined {
  if (!phase || !toRoles?.length) {
    return "No recipients — message has nowhere to land";
  }
  if (toRoles.includes("system")) return undefined;
  const need = PHASE_ROUTING[phase].required;
  const missing = need.filter((r) => !toRoles.includes(r));
  if (missing.length === need.length) {
    return `Routing gap in ${phase}: none of required roles (${need.join(", ")})`;
  }
  if (
    phase === "deficiency" &&
    !toRoles.includes("super") &&
    !toRoles.includes("foreman")
  ) {
    return "P0/deficiency must include super or foreman";
  }
  if (
    phase === "inspection" &&
    !toRoles.includes("inspector") &&
    !toRoles.includes("super")
  ) {
    return "Inspection traffic must include inspector or super";
  }
  if (
    phase === "closeout" &&
    toRoles.includes("crew") &&
    !toRoles.includes("super")
  ) {
    return "Closeout cannot go crew-only — super/owner required";
  }
  return undefined;
}

/** Archive filter helper (P2.5) */
export function filterCommsByDivision(
  messages: ProjectComm[],
  division: string,
): ProjectComm[] {
  const d = division.trim().toUpperCase();
  return messages.filter(
    (m) =>
      m.division.toUpperCase() === d ||
      m.scopes?.some((s) => s.toUpperCase() === d),
  );
}

export function filterCommsByVendor(
  messages: ProjectComm[],
  vendorId: string,
): ProjectComm[] {
  return messages.filter((m) => m.vendorId === vendorId);
}

export function filterCommsByContract(
  messages: ProjectComm[],
  contractId: string,
): ProjectComm[] {
  return messages.filter((m) => m.contractId === contractId);
}

function personByRole(org: CommOrg, role: CommRoleId) {
  return org.people.find((p) => p.roleId === role) ?? org.people[0];
}

function personById(org: CommOrg, id: string) {
  return org.people.find((p) => p.id === id);
}

function contractForDivision(org: CommOrg, division: string) {
  return (
    org.contracts.find((c) => c.divisions.includes(division)) ??
    org.contracts.find((c) => c.vendorId === "v_gc") ??
    org.contracts[0]
  );
}

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 3600_000).toISOString();
}

type Speak = {
  kind?: CommKind;
  phase: CommPhase;
  division: string;
  scopes?: string[];
  fromId: string;
  toIds: string[];
  text: string;
  ack?: boolean;
  month?: number;
  hours?: number;
  /** Force a specific contract (for multi-contract same vendor demos) */
  contractId?: string;
  vendorId?: string;
};

/** P5 depth floors (Ternfield-class scale, suite-wide). */
export const COMM_DEPTH_FLOOR = 40;
export const COMM_DEPTH_TARGET = 48;

/**
 * Seed multi-division communication log for one project.
 * Base narrative + densified multi-scope digests (P5 depth).
 */
export function generateProjectComms(
  meta: {
    id: string;
    name: string;
    stateCode: string;
    city?: string;
    industry: string;
    env?: string[];
    blurb?: string;
  },
  org: CommOrg,
): ProjectCommLog {
  const env = meta.env ?? [];
  const messages: ProjectComm[] = [];
  let seq = 0;

  const push = (s: Speak) => {
    const from =
      personById(org, s.fromId) ?? personByRole(org, "super");
    const tos = s.toIds
      .map((id) => personById(org, id))
      .filter(Boolean) as typeof org.people;
    const toRoles = [
      ...new Set(tos.map((p) => p.roleId as CommRoleId)),
    ] as CommRoleId[];
    // Ensure phase recipients meet routing where possible
    let finalToRoles = toRoles;
    let finalToNames = tos.map((p) => p.name);
    const gapPreview = routingGap(s.phase, finalToRoles);
    if (gapPreview && s.phase === "deficiency") {
      // Force fix — seed must not ship broken deficiency routing
      const superP = personByRole(org, "super");
      const foreP = personByRole(org, "foreman");
      finalToRoles = ["super", "foreman"];
      finalToNames = [superP.name, foreP.name];
    }

    let contractId = s.contractId;
    let vendorId = s.vendorId;
    if (!contractId || !vendorId) {
      const c = contractForDivision(org, s.division);
      contractId = contractId ?? c?.id;
      vendorId = vendorId ?? c?.vendorId;
    }
    // Hard fallback — every message is vendor/contract keyed (P3)
    if (!contractId || !vendorId) {
      const gc = org.contracts.find((x) => x.vendorId === "v_gc") ?? org.contracts[0];
      contractId = contractId ?? gc?.id ?? "C-GC-01";
      vendorId = vendorId ?? gc?.vendorId ?? "v_gc";
    }
    const gap = routingGap(s.phase, finalToRoles);
    seq += 1;
    messages.push({
      id: `cm_${meta.id}_${seq}`,
      projectId: meta.id,
      kind: s.kind ?? "status_update",
      phase: s.phase,
      division: s.division,
      scopes: s.scopes ?? [s.division],
      fromRole: from.roleId as CommRoleId,
      toRoles: finalToRoles,
      fromName: from.name,
      toNames: finalToNames,
      text: s.text,
      contractId,
      vendorId,
      ackRequired: s.ack,
      acked: s.ack ? false : undefined,
      programMonth: s.month ?? 0,
      createdAt: hoursAgo(s.hours ?? seq * 3),
      routingGap: gap,
    });
  };

  // —— Mobilization ——
  push({
    phase: "mobilization",
    kind: "handoff",
    division: "01",
    scopes: ["01", "BD"],
    fromId: "owner",
    toIds: ["super", "foreman", "bd"],
    text: `Day 0 — ${meta.name} (${meta.city || meta.stateCode}). Owner handoff to field. Stop-work authority is super. ${meta.blurb ?? ""}`.trim(),
    ack: true,
    month: 0,
    hours: 200,
  });
  push({
    phase: "mobilization",
    kind: "ack",
    division: "01",
    fromId: "super",
    toIds: ["owner", "foreman"],
    text: "Ack. Stop-work on safety/env is mine. Foreman sets daily brief. No trade NTP until gates clear.",
    month: 0,
    hours: 198,
  });
  push({
    phase: "mobilization",
    kind: "bd_lane",
    division: "BD",
    scopes: ["BD", "01"],
    fromId: "bd",
    toIds: ["owner", "super"],
    text: "Contract matrix posted. Owner soft cost + prime GC live. Trade NTPs staged to schedule gates.",
    month: 0,
    hours: 196,
  });

  // —— Walkdown ——
  push({
    phase: "walkdown",
    kind: "site_pack",
    division: "01",
    scopes: ["01", "31", "ENV"].filter((c) =>
      org.divisions.some((d) => d.code === c),
    ),
    fromId: "super",
    toIds: ["foreman", "owner"],
    text: `Site pack locked for field use — ${meta.stateCode} local coords only. Work limits marked. ${meta.id}.`,
    month: 1,
    hours: 180,
  });

  if (org.divisions.some((d) => d.code === "ENV")) {
    const envLead = org.people.find((p) => p.id === "env") ? "env" : "inspector";
    push({
      phase: "walkdown",
      division: "ENV",
      scopes: ["ENV", "31"].filter((c) =>
        org.divisions.some((d) => d.code === c),
      ),
      fromId: envLead,
      toIds: ["super", "foreman"],
      text: `Env walk: conditions ${env.slice(0, 3).join(", ") || "baseline"}. Buffer / control points confirmed before production.`,
      month: 1,
      hours: 170,
    });
  } else if (env.length) {
    // Env tags present but no ENV division — keep walk on 01
    push({
      phase: "walkdown",
      division: "01",
      scopes: ["01"],
      fromId: "super",
      toIds: ["foreman"],
      text: `Site walk: regional conditions noted (${env.slice(0, 3).join(", ")}). Controls per GC plan.`,
      month: 1,
      hours: 170,
    });
  }

  // —— Active work by trade divisions ——
  const tradeDivs = org.divisions
    .map((d) => d.code)
    .filter((c) => !["01", "AHJ", "BD"].includes(c));

  for (const div of tradeDivs.slice(0, 6)) {
    const lead = org.divisions.find((d) => d.code === div)?.leadId ?? "foreman";
    push({
      phase: "active_work",
      division: div,
      scopes: [div, "01"],
      fromId: lead,
      toIds: ["super", "foreman"],
      text: `Div ${div} production update — crew on plan. Materials / access coordinated with GC. No open P0 in this bay.`,
      month: 2 + tradeDivs.indexOf(div),
      hours: 140 - tradeDivs.indexOf(div) * 4,
    });
  }

  // Civil beat
  if (org.divisions.some((d) => d.code === "31")) {
    push({
      phase: "active_work",
      division: "31",
      scopes: ["31", "33"].filter((c) =>
        org.divisions.some((d) => d.code === c),
      ),
      fromId: org.people.some((p) => p.id === "civil") ? "civil" : "foreman",
      toIds: ["super", "foreman"],
      text: "Civil: grade and utility corridor on sequence. Storm controls in place before next rain window.",
      month: 3,
      hours: 100,
    });
  }

  // —— Inspection ——
  push({
    phase: "inspection",
    kind: "inspection_request",
    division: "AHJ",
    scopes: ["AHJ", "01"],
    fromId: "super",
    toIds: ["inspector", "bd"],
    text: "Requesting inspection window — primary work zone ready for walk. Area open, documents staged.",
    month: 4,
    hours: 72,
  });
  push({
    phase: "inspection",
    kind: "inspection_result",
    division: "AHJ",
    fromId: "inspector",
    toIds: ["super", "foreman"],
    text: "Inspection result logged — see board. Corrections (if any) before cover.",
    month: 4,
    hours: 60,
  });

  // —— Deficiency (must route to super/foreman) ——
  const defDiv =
    env.includes("wetland_swq") || env.includes("coastal_flood")
      ? org.divisions.some((d) => d.code === "ENV")
        ? "ENV"
        : "01"
      : "01";
  push({
    phase: "deficiency",
    kind: "escalation",
    division: defDiv,
    scopes: [defDiv, "01"],
    fromId: org.people.some((p) => p.id === "crew_civil")
      ? "crew_civil"
      : "foreman",
    toIds: ["super", "foreman"],
    text:
      defDiv === "ENV"
        ? "P0 field hold — control/buffer concern. Stop in zone until super + env clear."
        : "P1 coordination hold — trade stacking conflict. Super decision needed before restart.",
    ack: true,
    month: 5,
    hours: 48,
  });
  push({
    phase: "resolution",
    division: defDiv,
    scopes: [defDiv, "01"],
    fromId: "super",
    toIds: ["foreman", "inspector"],
    text: "Resolution path set — evidence and re-walk scheduled. Pin stays open until verified.",
    month: 5,
    hours: 36,
  });

  // —— MEP / electrical if present ——
  if (org.divisions.some((d) => d.code === "26")) {
    push({
      phase: "active_work",
      division: "26",
      fromId: org.people.some((p) => p.id === "elec") ? "elec" : "mep",
      toIds: ["super", "foreman"],
      text: "Electrical: feeders and gear staging on plan. Coordination with structure for penetrations.",
      month: 6,
      hours: 30,
    });
  }
  if (org.divisions.some((d) => d.code === "23")) {
    push({
      phase: "active_work",
      division: "23",
      fromId: org.people.some((p) => p.id === "mep") ? "mep" : "foreman",
      toIds: ["super", "foreman"],
      text: "HVAC: equipment set points and curb coordination. No cover before inspection.",
      month: 6,
      hours: 28,
    });
  }

  // —— Same vendor, two contracts (P3.4) — GC prime + GC allowance ——
  const gcContracts = org.contracts.filter((c) => c.vendorId === "v_gc");
  if (gcContracts.length >= 2) {
    push({
      phase: "active_work",
      division: "01",
      scopes: ["01"],
      fromId: "super",
      toIds: ["foreman", "owner"],
      text: `GC prime contract (${gcContracts[0]!.id}) — general conditions burn and field office cost tracking.`,
      contractId: gcContracts[0]!.id,
      vendorId: "v_gc",
      month: 3,
      hours: 90,
    });
    push({
      phase: "active_work",
      division: "01",
      scopes: ["01"],
      fromId: "foreman",
      toIds: ["super", "foreman"],
      text: `GC allowance draw (${gcContracts[1]!.id}) — temp power / fence under allowance schedule. Same vendor, separate contract log.`,
      contractId: gcContracts[1]!.id,
      vendorId: "v_gc",
      month: 3,
      hours: 88,
    });
  }

  // —— Closeout path ——
  push({
    phase: "closeout",
    kind: "bd_lane",
    division: "BD",
    scopes: ["BD", "AHJ", "01"],
    fromId: "bd",
    toIds: ["owner", "super"],
    text: "Closeout package drafting — as-builts and inspection trail. Super + owner required on final path.",
    month: 8,
    hours: 12,
  });
  push({
    phase: "closeout",
    division: "01",
    scopes: ["01", "BD"],
    fromId: "super",
    toIds: ["owner", "bd"],
    text: "Field closeout walk scheduled. Open acks and P0s must clear before all-clear language.",
    month: 8,
    hours: 8,
  });

  // —— P5 densify: multi-scope monthly digests + env beats ——
  densifyCommLog(push, meta, org, env, messages.length);

  return {
    version: 1,
    projectId: meta.id,
    messages,
    generatedAt: new Date().toISOString(),
  };
}

const ENV_BEAT: Record<string, string> = {
  coastal_hurricane: "Hurricane window prep — temporary bracing and material tie-downs verified.",
  coastal_flood: "Flood elevation check — pumps and sandbag staging reviewed at low points.",
  desert_heat: "Heat protocol — crew rotation and night work window confirmed.",
  high_altitude: "Altitude curing note — concrete protection plan active.",
  freeze_thaw: "Freeze-thaw hold — blankets/heaters staged before overnight lows.",
  seismic: "Seismic special inspection package — brace frame docs complete before cover.",
  wildfire_wui: "WUI hardening — ignition-resistant materials on exposed elevations.",
  tornado_alley: "Severe wind plan — safe room / shelter path briefed to trades.",
  urban_dense: "Urban logistics — crane/street permit coordination for next picks.",
  wetland_swq: "SWQ BMP check — inlet protection and silt fence after rain event.",
  cold_winter: "Cold-weather concrete — recorded temps required before next pour.",
  humid_subtropical: "Humidity envelope note — moisture control on stored materials.",
  volcanic_island: "Ash/corrosion protocol — exterior equipment covers in place.",
  permafrost_edge: "Frost-susceptible soils — thermal pile monitoring on schedule.",
  lake_effect_snow: "Snow load / roof drain clear — access lanes plowed for deliveries.",
  expansive_soil: "Expansive clay monitoring — moisture barriers at grade beams.",
  high_wind_plain: "High-wind hold criteria posted — exterior picks paused above threshold.",
  karst_sinkhole: "Karst probe note — geotech flag on new excavation area.",
};

function densifyCommLog(
  push: (s: Speak) => void,
  meta: { id: string; name: string; stateCode: string; industry: string },
  org: CommOrg,
  env: string[],
  currentCount: number,
): void {
  const need = Math.max(0, COMM_DEPTH_TARGET - currentCount);
  if (need === 0) return;

  const tradeDivs = org.divisions
    .map((d) => d.code)
    .filter((c) => !["AHJ"].includes(c));
  const voices: Array<{ fromId: string; toIds: string[]; division: string }> = [
    { fromId: "super", toIds: ["foreman", "bd"], division: "01" },
    { fromId: "foreman", toIds: ["super"], division: "01" },
    { fromId: "bd", toIds: ["super", "owner"], division: "BD" },
    { fromId: "inspector", toIds: ["super", "foreman"], division: "AHJ" },
  ];
  if (org.people.some((p) => p.id === "civil")) {
    voices.push({
      fromId: "civil",
      toIds: ["super", "foreman"],
      division: tradeDivs.includes("31") ? "31" : "01",
    });
  }
  if (org.people.some((p) => p.id === "mep")) {
    voices.push({
      fromId: "mep",
      toIds: ["super", "foreman"],
      division: tradeDivs.includes("23") ? "23" : "22",
    });
  }
  if (org.people.some((p) => p.id === "elec")) {
    voices.push({
      fromId: "elec",
      toIds: ["super", "foreman"],
      division: "26",
    });
  }
  if (org.people.some((p) => p.id === "env")) {
    voices.push({
      fromId: "env",
      toIds: ["super", "foreman"],
      division: "ENV",
    });
  }
  if (org.people.some((p) => p.id === "struct")) {
    voices.push({
      fromId: "struct",
      toIds: ["super", "foreman"],
      division: tradeDivs.includes("05") ? "05" : "03",
    });
  }

  // Multi-scope standups (thread across divisions)
  for (let i = 0; i < Math.min(need, 12); i++) {
    const month = 2 + (i % 8);
    const scopes = [
      "01",
      ...tradeDivs.filter((c) => c !== "01").slice(0, 3 + (i % 3)),
    ].filter((c, idx, arr) => arr.indexOf(c) === idx);
    const primary = scopes[0] ?? "01";
    const isInsp = i % 5 === 0;
    push({
      phase: isInsp ? "inspection" : "active_work",
      division: primary,
      scopes,
      fromId: "super",
      // Inspection must include super or inspector on the to-list
      toIds: isInsp
        ? ["inspector", "foreman", "bd"]
        : ["foreman", "bd"].concat(
            org.people.some((p) => p.id === "civil") ? ["civil"] : [],
          ),
      text: `Multi-scope standup M${month} — [${scopes.map((s) => (s === "ENV" || s === "AHJ" || s === "BD" ? s : `D${s}`)).join("+")}] ${meta.industry} production. Float check, deliveries, and open inspections. ${meta.name.slice(0, 40)}.`,
      month,
      hours: 160 - i * 3,
    });
  }

  // Env-specific risk beats (P5.4)
  let envBeats = 0;
  for (const e of env.slice(0, 4)) {
    const body = ENV_BEAT[e];
    if (!body) continue;
    const div =
      org.divisions.some((d) => d.code === "ENV") &&
      ["wetland_swq", "coastal_flood", "wildfire_wui", "seismic"].includes(e)
        ? "ENV"
        : "01";
    push({
      phase: e.includes("flood") || e.includes("hurricane") || e.includes("seismic")
        ? "deficiency"
        : "active_work",
      kind:
        e.includes("flood") || e.includes("hurricane") || e.includes("seismic")
          ? "escalation"
          : "status_update",
      division: div,
      scopes: [div, "01"],
      fromId:
        div === "ENV" && org.people.some((p) => p.id === "env")
          ? "env"
          : "foreman",
      toIds: ["super", "foreman"],
      text: `Env condition [${e}]: ${body}`,
      ack: e.includes("hurricane") || e.includes("flood") || e.includes("seismic"),
      month: 4 + envBeats,
      hours: 50 - envBeats * 2,
    });
    envBeats += 1;
  }

  // Rotate trade digests until target
  let i = 0;
  while (i < need * 2) {
    // approximate — push always grows; stop when caller has enough by re-checking is hard
    // We rely on need from initial count; each push in densify increases total by 1
    // Count pushes: we already did multi-scope + env. Fill remainder with voices.
    i += 1;
    if (i > need + 20) break;
    const v = voices[i % voices.length]!;
    const div = org.divisions.some((d) => d.code === v.division)
      ? v.division
      : "01";
    // Stop if we've added enough (multi-scope ~12 + env + this loop)
    // Use a soft cap: densify adds at most COMM_DEPTH_TARGET + 10 over base... 
    // Simpler: fill fixed remaining after multi+env
    break;
  }

  // Explicit remainder fill
  const afterSpecial = currentCount + Math.min(need, 12) + envBeats;
  const stillNeed = Math.max(0, COMM_DEPTH_TARGET - afterSpecial);
  for (let j = 0; j < stillNeed; j++) {
    const v = voices[j % voices.length]!;
    const div = org.divisions.some((d) => d.code === v.division)
      ? v.division
      : "01";
    const lead = org.divisions.find((d) => d.code === div)?.leadId;
    const phase: CommPhase =
      j % 7 === 0 ? "walkdown" : j % 5 === 0 ? "inspection" : "active_work";
    let toIds = v.toIds.filter((id) => org.people.some((p) => p.id === id));
    if (phase === "inspection") {
      toIds = ["super", "inspector"].filter((id) =>
        org.people.some((p) => p.id === id),
      );
      if (toIds.length === 0) toIds = ["super"];
    } else if (phase === "walkdown") {
      toIds = ["super", "foreman"].filter((id) =>
        org.people.some((p) => p.id === id),
      );
    } else if (phase === "active_work") {
      // Ensure at least one required role lands
      if (!toIds.includes("foreman") && org.people.some((p) => p.id === "foreman")) {
        toIds = ["foreman", ...toIds];
      }
    }
    push({
      phase,
      division: div,
      scopes: [div, "01"].filter((c, idx, a) => a.indexOf(c) === idx),
      fromId: org.people.some((p) => p.id === v.fromId) ? v.fromId : "super",
      toIds: toIds.length ? toIds : ["super"],
      text: `Digest #${j + 1} Div ${div} — ${meta.stateCode} ${meta.industry}: manpower, materials, and constraints. Lead ${lead ?? "super"}. No all-clear while open holds remain.`,
      month: 1 + (j % 10),
      hours: 120 - j,
    });
  }
}

/** P5 depth validation */
export function validateProjectCommDepth(
  log: ProjectCommLog | null | undefined,
  meta?: { env?: string[] },
): {
  ok: boolean;
  checks: Array<{ id: string; ok: boolean; detail: string }>;
} {
  const checks: Array<{ id: string; ok: boolean; detail: string }> = [];
  if (!log?.messages?.length) {
    return {
      ok: false,
      checks: [{ id: "P5.0", ok: false, detail: "comm log missing" }],
    };
  }
  const msgs = log.messages;
  const fullCount =
    typeof (log as { fullMessageCount?: number }).fullMessageCount === "number"
      ? (log as { fullMessageCount: number }).fullMessageCount
      : msgs.length;
  // Extreme interval mode: floor is much higher; legacy densify still uses COMM_DEPTH_FLOOR
  const floor =
    (log as { mode?: string }).mode === "interval_15m"
      ? 1000
      : COMM_DEPTH_FLOOR;
  const depthOk = fullCount >= floor;
  checks.push({
    id: "P5.1",
    ok: depthOk,
    detail: depthOk
      ? `fullCount=${fullCount} sample=${msgs.length} (floor ${floor})`
      : `below floor fullCount=${fullCount}<${floor}`,
  });

  const phases = new Set(msgs.map((m) => m.phase));
  const phaseOk =
    phases.has("mobilization") &&
    phases.has("active_work") &&
    phases.has("closeout");
  checks.push({
    id: "P5.2",
    ok: phaseOk,
    detail: phaseOk
      ? "inception+active+closeout present"
      : `phases=${[...phases].join(",")}`,
  });

  const multiScope = msgs.filter((m) => (m.scopes?.length ?? 0) >= 2);
  const multiDiv = new Set(msgs.map((m) => m.division)).size >= 3;
  checks.push({
    id: "P5.3",
    ok: multiScope.length >= 3 && multiDiv,
    detail: `multi-scope msgs=${multiScope.length} distinctDivs=${new Set(msgs.map((m) => m.division)).size}`,
  });

  const env = meta?.env ?? [];
  let envOk = true;
  let envDetail = "no env tags";
  if (env.length > 0) {
    const hit = msgs.some(
      (m) =>
        env.some((e) => m.text.includes(e)) ||
        /Env condition|SWQ|heat protocol|Freeze|Seismic|Hurricane|flood/i.test(
          m.text,
        ),
    );
    envOk = hit;
    envDetail = hit
      ? `env referenced (${env.slice(0, 3).join(",")})`
      : "env tags present but not referenced in comms";
  }
  checks.push({ id: "P5.4", ok: envOk, detail: envDetail });

  // Keep P2/P3 integrity under depth
  const keyed = msgs.every((m) => m.vendorId && m.contractId && m.division);
  checks.push({
    id: "P5.5",
    ok: keyed,
    detail: keyed
      ? "depth msgs still division+vendor+contract keyed"
      : "depth broke keying",
  });

  const criticalGaps = msgs.filter(
    (m) =>
      m.routingGap &&
      (m.phase === "deficiency" || m.phase === "closeout"),
  );
  checks.push({
    id: "P5.6",
    ok: criticalGaps.length === 0,
    detail:
      criticalGaps.length === 0
        ? "no critical routing gaps under depth"
        : `gaps=${criticalGaps.length}`,
  });

  return { ok: checks.every((c) => c.ok), checks };
}

/**
 * Build vendor → messages index for archive / P3 sort modes.
 */
export function buildVendorCommIndex(messages: ProjectComm[]): Record<
  string,
  { vendorId: string; contractIds: string[]; messageIds: string[]; count: number }
> {
  const idx: Record<
    string,
    { vendorId: string; contractIds: string[]; messageIds: string[]; count: number }
  > = {};
  for (const m of messages) {
    if (!m.vendorId) continue;
    if (!idx[m.vendorId]) {
      idx[m.vendorId] = {
        vendorId: m.vendorId,
        contractIds: [],
        messageIds: [],
        count: 0,
      };
    }
    const row = idx[m.vendorId]!;
    row.messageIds.push(m.id);
    row.count += 1;
    if (m.contractId && !row.contractIds.includes(m.contractId)) {
      row.contractIds.push(m.contractId);
    }
  }
  return idx;
}

export function buildContractCommIndex(messages: ProjectComm[]): Record<
  string,
  { contractId: string; vendorId?: string; messageIds: string[]; count: number }
> {
  const idx: Record<
    string,
    { contractId: string; vendorId?: string; messageIds: string[]; count: number }
  > = {};
  for (const m of messages) {
    if (!m.contractId) continue;
    if (!idx[m.contractId]) {
      idx[m.contractId] = {
        contractId: m.contractId,
        vendorId: m.vendorId,
        messageIds: [],
        count: 0,
      };
    }
    const row = idx[m.contractId]!;
    row.messageIds.push(m.id);
    row.count += 1;
  }
  return idx;
}

/** P3 validation — vendor × contract logging completeness */
export function validateProjectVendorComms(
  log: ProjectCommLog | null | undefined,
  org: CommOrg | null | undefined,
): {
  ok: boolean;
  checks: Array<{ id: string; ok: boolean; detail: string }>;
} {
  const checks: Array<{ id: string; ok: boolean; detail: string }> = [];
  if (!log?.messages?.length) {
    return {
      ok: false,
      checks: [{ id: "P3.0", ok: false, detail: "comm log missing" }],
    };
  }
  const msgs = log.messages;

  const trade = msgs.filter((m) => isTradeDivision(m.division));
  const tradeKeyed = trade.every((m) => Boolean(m.vendorId && m.contractId));
  checks.push({
    id: "P3.1",
    ok: tradeKeyed && trade.length > 0,
    detail: tradeKeyed
      ? `trade msgs keyed ${trade.length}/${trade.length}`
      : `trade missing vendor/contract (${trade.filter((m) => !m.vendorId || !m.contractId).length})`,
  });

  // All messages should be keyed (desk + trade)
  const allKeyed = msgs.every((m) => Boolean(m.vendorId && m.contractId));
  checks.push({
    id: "P3.1b",
    ok: allKeyed,
    detail: allKeyed
      ? "all messages vendor+contract keyed"
      : "some messages missing vendorId/contractId",
  });

  const vendors = org?.vendors ?? [];
  const vendorLinked =
    vendors.length >= 2 && vendors.every((v) => v.contractIds.length > 0);
  checks.push({
    id: "P3.2",
    ok: vendorLinked,
    detail: vendorLinked
      ? `vendors=${vendors.length} all linked to contracts`
      : "vendor missing or unlinked to contracts",
  });

  const byVendor = buildVendorCommIndex(msgs);
  const byContract = buildContractCommIndex(msgs);
  const filterVendorOk =
    Object.keys(byVendor).length > 0 &&
    Object.values(byVendor).every((v) => {
      const f = filterCommsByVendor(msgs, v.vendorId);
      return f.length === v.count;
    });
  const filterContractOk =
    Object.keys(byContract).length > 0 &&
    Object.values(byContract).every((c) => {
      const f = filterCommsByContract(msgs, c.contractId);
      return f.length === c.count;
    });
  checks.push({
    id: "P3.3",
    ok: filterVendorOk && filterContractOk,
    detail:
      filterVendorOk && filterContractOk
        ? `archive groups vendors=${Object.keys(byVendor).length} contracts=${Object.keys(byContract).length}`
        : "vendor/contract group filters failed",
  });

  // Same vendor on ≥2 contracts in the log
  const multiContractVendor = Object.values(byVendor).find(
    (v) => v.contractIds.length >= 2,
  );
  checks.push({
    id: "P3.4",
    ok: Boolean(multiContractVendor),
    detail: multiContractVendor
      ? `cross-contract vendor ${multiContractVendor.vendorId} contracts=${multiContractVendor.contractIds.join(",")}`
      : "no vendor appears on multiple contracts in log",
  });

  // Vendor index coverage — every trade vendor in org appears at least once if they have trade divs
  const tradeVendors = vendors.filter((v) =>
    (v.divisionCodes ?? []).some((d) => isTradeDivision(d)),
  );
  const covered = tradeVendors.filter((v) => byVendor[v.id]?.count);
  const coverOk =
    tradeVendors.length === 0 || covered.length >= Math.min(2, tradeVendors.length);
  checks.push({
    id: "P3.5",
    ok: coverOk,
    detail: `trade vendors in log ${covered.length}/${tradeVendors.length}`,
  });

  return { ok: checks.every((c) => c.ok), checks };
}

export function validateProjectComms(
  log: ProjectCommLog | null | undefined,
  org: CommOrg | null | undefined,
): {
  ok: boolean;
  checks: Array<{ id: string; ok: boolean; detail: string }>;
} {
  const checks: Array<{ id: string; ok: boolean; detail: string }> = [];
  if (!log || !Array.isArray(log.messages)) {
    return {
      ok: false,
      checks: [{ id: "P2.0", ok: false, detail: "comm log missing" }],
    };
  }

  const msgs = log.messages;
  const hasMsgs = msgs.length >= 8;
  checks.push({
    id: "P2.1",
    ok: hasMsgs,
    detail: hasMsgs ? `messages=${msgs.length}` : "need ≥8 seed messages",
  });

  const allHaveDiv = msgs.every(
    (m) => typeof m.division === "string" && m.division.length > 0,
  );
  checks.push({
    id: "P2.2",
    ok: allHaveDiv,
    detail: allHaveDiv
      ? "all messages have division"
      : "message missing division",
  });

  const orgCodes = new Set(org?.divisions.map((d) => d.code) ?? []);
  const unknown = msgs.filter(
    (m) => orgCodes.size > 0 && !orgCodes.has(m.division),
  );
  // Allow if org missing (should not happen after P1)
  const knownOk = orgCodes.size === 0 || unknown.length === 0;
  checks.push({
    id: "P2.3",
    ok: knownOk,
    detail: knownOk
      ? "divisions match org"
      : `unknown divisions: ${[...new Set(unknown.map((m) => m.division))].join(",")}`,
  });

  const defMsgs = msgs.filter((m) => m.phase === "deficiency");
  const defRouted = defMsgs.every(
    (m) =>
      m.toRoles.includes("super") ||
      m.toRoles.includes("foreman"),
  );
  const noBadGaps = msgs
    .filter((m) => m.phase === "deficiency" || m.phase === "closeout")
    .every((m) => !m.routingGap);
  checks.push({
    id: "P2.4",
    ok: (defMsgs.length === 0 || defRouted) && noBadGaps,
    detail:
      defMsgs.length === 0
        ? "no deficiency msgs"
        : defRouted && noBadGaps
          ? "deficiency/closeout routing clean"
          : "routing gap on critical phase",
  });

  // Filter capability
  const sampleDiv = msgs[0]?.division ?? "01";
  const filtered = filterCommsByDivision(msgs, sampleDiv);
  const filterOk =
    filtered.length > 0 &&
    filtered.every(
      (m) =>
        m.division === sampleDiv ||
        m.scopes?.includes(sampleDiv),
    );
  checks.push({
    id: "P2.5",
    ok: filterOk,
    detail: filterOk
      ? `filter(${sampleDiv})=${filtered.length}`
      : "division filter failed",
  });

  // Multi-division coverage
  const distinctDivs = new Set(msgs.map((m) => m.division));
  const multiOk = distinctDivs.size >= 3;
  checks.push({
    id: "P2.6",
    ok: multiOk,
    detail: multiOk
      ? `distinct divisions=${distinctDivs.size}`
      : "need ≥3 divisions in log",
  });

  // Phase coverage
  const phases = new Set(msgs.map((m) => m.phase));
  const phaseOk =
    phases.has("mobilization") &&
    phases.has("active_work") &&
    (phases.has("inspection") || phases.has("closeout"));
  checks.push({
    id: "P2.7",
    ok: phaseOk,
    detail: phaseOk
      ? `phases=${[...phases].join(",")}`
      : "missing mobilization/active/inspection|closeout",
  });

  return { ok: checks.every((c) => c.ok), checks };
}
