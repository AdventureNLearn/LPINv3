/**
 * Generate a full ProjectOrg for any portfolio ProjectMeta.
 * Deterministic from project id (same id → same org).
 *
 * Self-contained (no relative imports) so Node harness can load via
 * --experimental-strip-types without extension resolution issues.
 */

export type OrgRoleId =
  | "super"
  | "foreman"
  | "crew"
  | "inspector"
  | "owner"
  | "bd"
  | "system";

export type ContractStatus = "executed" | "pending" | "closeout";

export interface OrgPerson {
  id: string;
  name: string;
  title: string;
  company: string;
  roleId: OrgRoleId;
  divisionCodes?: string[];
  trade?: string;
}

export interface OrgDivision {
  code: string;
  name: string;
  leadId: string;
}

export interface OrgContract {
  id: string;
  name: string;
  contractor: string;
  vendorId: string;
  valueLabel: string;
  divisions: string[];
  status: ContractStatus;
  noticeToProceedMonth: number;
}

export interface OrgVendor {
  id: string;
  name: string;
  kind: "gc" | "trade" | "env" | "owner" | "supply" | "consultant";
  contractIds: string[];
  divisionCodes: string[];
}

export interface ProjectOrg {
  version: 1;
  projectId: string;
  people: OrgPerson[];
  divisions: OrgDivision[];
  contracts: OrgContract[];
  vendors: OrgVendor[];
  generatedAt: string;
}

export const DIVISION_CATALOG: Record<string, string> = {
  "01": "General requirements",
  "02": "Existing conditions",
  "03": "Concrete",
  "04": "Masonry",
  "05": "Metals / structure",
  "06": "Wood / plastics / composites",
  "07": "Thermal & moisture",
  "08": "Openings",
  "09": "Finishes",
  "21": "Fire suppression",
  "22": "Plumbing",
  "23": "HVAC",
  "26": "Electrical",
  "27": "Communications",
  "28": "Electronic safety",
  "31": "Earthwork",
  "32": "Exterior improvements",
  "33": "Utilities",
  ENV: "Env / mitigation / water",
  AHJ: "Inspections & AHJ",
  BD: "Building dept / land use",
  LS: "Life safety",
  CX: "Commissioning",
};

type Industry =
  | "single_family"
  | "multi_family"
  | "commercial"
  | "industrial"
  | "civil"
  | "renovation"
  | "hospitality"
  | "healthcare"
  | "education";

export interface OrgMetaInput {
  id: string;
  name: string;
  city?: string;
  stateCode: string;
  industry: Industry | string;
  env?: string[];
  captain?: string;
  phase?: string;
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function pick<T>(arr: T[], h: number, i: number): T {
  return arr[(h + i * 17) % arr.length]!;
}

const FIRST = [
  "Alex",
  "Jordan",
  "Sam",
  "Casey",
  "Riley",
  "Morgan",
  "Quinn",
  "Avery",
  "Reese",
  "Drew",
  "Parker",
  "Cameron",
  "Jamie",
  "Taylor",
  "Blake",
];
const LAST = [
  "Nguyen",
  "Patel",
  "Brooks",
  "Okoye",
  "Santos",
  "Keller",
  "Singh",
  "Morales",
  "Chen",
  "Hughes",
  "Diaz",
  "Walsh",
  "Kim",
  "Foster",
  "Reed",
];

const GC_FIRMS = [
  "Ridge & Basin Constructors",
  "Harborline GC",
  "Summit Field Builders",
  "Prairie Span Construction",
  "Ironwood General",
];
const CIVIL_FIRMS = [
  "Marlow Earthworks",
  "Basin Grade Civil",
  "Northfork Siteworks",
  "Clearspan Utilities",
];
const MEP_FIRMS = [
  "CoolSpan Systems",
  "Aether Mechanical",
  "Circuit & Coil MEP",
  "Parkline Power",
];
const STRUCT_FIRMS = [
  "Harwick Steel & Form",
  "Keystone Structure",
  "Bent Plate Fabricators",
  "Slabline Concrete",
];
const ENV_FIRMS = [
  "Little Tern Environmental",
  "Watershed Field Services",
  "Greenline Compliance",
  "Buffer Stake Consulting",
];
const OWNER_FIRMS = [
  "Prairie Reach Holdings",
  "Civic Development Partners",
  "Harbor Owner Rep LLC",
  "Metro Asset Group",
];

function industryDivisionCodes(industry: string, env: string[]): string[] {
  const codes = new Set<string>(["01", "AHJ", "BD"]);
  const add = (...c: string[]) => c.forEach((x) => codes.add(x));

  switch (industry) {
    case "single_family":
      add("03", "06", "07", "08", "09", "22", "26", "31");
      break;
    case "multi_family":
      add("03", "05", "07", "08", "09", "21", "22", "23", "26", "31", "LS");
      break;
    case "commercial":
      add("03", "05", "07", "08", "09", "21", "22", "23", "26", "27", "31", "LS");
      break;
    case "industrial":
      add("03", "05", "07", "22", "23", "26", "31", "33", "CX");
      break;
    case "civil":
      add("31", "32", "33", "ENV");
      break;
    case "renovation":
      add("02", "07", "08", "09", "22", "23", "26", "LS");
      break;
    case "hospitality":
      add("03", "05", "07", "08", "09", "21", "22", "23", "26", "LS", "CX");
      break;
    case "healthcare":
      add("03", "05", "07", "08", "09", "21", "22", "23", "26", "27", "LS", "CX");
      break;
    case "education":
      add("03", "05", "07", "08", "09", "21", "22", "23", "26", "27", "31", "LS");
      break;
    default:
      add("03", "05", "22", "26", "31");
  }

  if (
    env.some((e) =>
      [
        "wetland_swq",
        "coastal_flood",
        "coastal_hurricane",
        "wildfire_wui",
        "seismic",
      ].includes(e),
    )
  ) {
    add("ENV");
  }
  if (env.includes("seismic") || env.includes("high_wind_plain")) add("05");
  if (env.includes("cold_winter") || env.includes("freeze_thaw")) add("07");

  return [...codes].sort((a, b) => a.localeCompare(b));
}

function person(
  id: string,
  name: string,
  title: string,
  company: string,
  roleId: OrgRoleId,
  divisionCodes?: string[],
  trade?: string,
): OrgPerson {
  return { id, name, title, company, roleId, divisionCodes, trade };
}

function contract(
  id: string,
  name: string,
  contractor: string,
  vendorId: string,
  valueLabel: string,
  divisions: string[],
  ntp: number,
  status: ContractStatus = "executed",
): OrgContract {
  return {
    id,
    name,
    contractor,
    vendorId,
    valueLabel,
    divisions,
    status,
    noticeToProceedMonth: ntp,
  };
}

function vendor(
  id: string,
  name: string,
  kind: OrgVendor["kind"],
  contractIds: string[],
  divisionCodes: string[],
): OrgVendor {
  return { id, name, kind, contractIds, divisionCodes };
}

/** Build deterministic org graph for a project. */
export function generateProjectOrg(meta: OrgMetaInput): ProjectOrg {
  const h = hash(meta.id);
  const env = meta.env ?? [];
  const divCodes = industryDivisionCodes(meta.industry, env);
  const gcName = pick(GC_FIRMS, h, 1);
  const civilName = pick(CIVIL_FIRMS, h, 2);
  const mepName = pick(MEP_FIRMS, h, 3);
  const structName = pick(STRUCT_FIRMS, h, 4);
  const envName = pick(ENV_FIRMS, h, 5);
  const ownerName = pick(OWNER_FIRMS, h, 6);

  const nameAt = (i: number) =>
    `${pick(FIRST, h, i)} ${pick(LAST, h, i + 3)}`;

  const superName =
    meta.captain?.replace(/\s*\([^)]*\)\s*$/, "").trim() || nameAt(0);

  const people: OrgPerson[] = [
    person("owner", nameAt(1), "Owner / Developer Rep", ownerName, "owner", [
      "01",
      "BD",
    ]),
    person(
      "super",
      superName,
      "Superintendent",
      gcName,
      "super",
      ["01", ...divCodes.filter((c) => c !== "AHJ" && c !== "BD").slice(0, 4)],
    ),
    person("foreman", nameAt(2), "General Foreman", gcName, "foreman", [
      "01",
      "03",
      "05",
    ]),
    person("bd", nameAt(3), "Permits / BD Coordinator", ownerName, "bd", [
      "BD",
      "AHJ",
      "01",
    ]),
    person(
      "inspector",
      nameAt(4),
      "Field Inspector",
      `${meta.city || meta.stateCode} Building Dept (demo)`,
      "inspector",
      ["AHJ"],
      "AHJ",
    ),
  ];

  if (divCodes.includes("31") || divCodes.includes("33")) {
    people.push(
      person(
        "civil",
        nameAt(5),
        "Civil Super",
        civilName,
        "foreman",
        ["31", "32", "33"].filter((c) => divCodes.includes(c)),
        "Div 31/33",
      ),
      person(
        "crew_civil",
        nameAt(6),
        "Crew Lead — Earthwork",
        civilName,
        "crew",
        ["31"],
        "Div 31",
      ),
    );
  }

  if (
    divCodes.includes("22") ||
    divCodes.includes("23") ||
    divCodes.includes("26")
  ) {
    people.push(
      person(
        "mep",
        nameAt(7),
        "MEP Super",
        mepName,
        "foreman",
        ["22", "23", "26"].filter((c) => divCodes.includes(c)),
        "MEP",
      ),
    );
  }

  if (divCodes.includes("26")) {
    people.push(
      person(
        "elec",
        nameAt(8),
        "Electrical Super",
        pick(MEP_FIRMS, h, 8),
        "foreman",
        ["26"],
        "Div 26",
      ),
    );
  }

  if (divCodes.includes("03") || divCodes.includes("05")) {
    people.push(
      person(
        "struct",
        nameAt(9),
        "Structure Foreman",
        structName,
        "crew",
        ["03", "05"].filter((c) => divCodes.includes(c)),
        "Div 03/05",
      ),
    );
  }

  if (divCodes.includes("ENV")) {
    people.push(
      person(
        "env",
        nameAt(10),
        "Env Compliance Lead",
        envName,
        "inspector",
        ["ENV", "31"],
        "Env / mitigation",
      ),
    );
  }

  if (divCodes.includes("CX")) {
    people.push(
      person("cx", nameAt(11), "QA / Commissioning", gcName, "super", [
        "CX",
        "01",
      ], "CX"),
    );
  }

  const leadFor = (code: string): string => {
    if (code === "01") return "super";
    if (code === "AHJ") return "inspector";
    if (code === "BD") return "bd";
    if (code === "ENV")
      return people.some((p) => p.id === "env") ? "env" : "super";
    if (code === "31" || code === "32" || code === "33")
      return people.some((p) => p.id === "civil") ? "civil" : "foreman";
    if (code === "22" || code === "23")
      return people.some((p) => p.id === "mep") ? "mep" : "foreman";
    if (code === "26")
      return people.some((p) => p.id === "elec")
        ? "elec"
        : people.some((p) => p.id === "mep")
          ? "mep"
          : "foreman";
    if (code === "03" || code === "05")
      return people.some((p) => p.id === "struct") ? "struct" : "foreman";
    if (code === "CX")
      return people.some((p) => p.id === "cx") ? "cx" : "super";
    return "foreman";
  };

  const divisions: OrgDivision[] = divCodes.map((code) => ({
    code,
    name: DIVISION_CATALOG[code] ?? `Division ${code}`,
    leadId: leadFor(code),
  }));

  for (const d of divisions) {
    if (!people.some((p) => p.id === d.leadId)) d.leadId = "super";
  }

  const contracts: OrgContract[] = [];
  const vendors: OrgVendor[] = [];

  const addVendorContract = (
    vId: string,
    vName: string,
    kind: OrgVendor["kind"],
    c: OrgContract,
  ) => {
    contracts.push(c);
    const existing = vendors.find((v) => v.id === vId);
    if (existing) {
      existing.contractIds.push(c.id);
      for (const d of c.divisions) {
        if (!existing.divisionCodes.includes(d)) existing.divisionCodes.push(d);
      }
    } else {
      vendors.push(vendor(vId, vName, kind, [c.id], [...c.divisions]));
    }
  };

  addVendorContract(
    "v_owner",
    ownerName,
    "owner",
    contract(
      "C-OWN-01",
      "Owner soft cost / permits",
      ownerName,
      "v_owner",
      "Owner-direct",
      ["BD", "AHJ", "01"].filter((c) => divCodes.includes(c)),
      0,
    ),
  );

  const gcDivs = divCodes.filter((c) =>
    ["01", "02", "03", "05", "06", "07", "08", "09", "LS"].includes(c),
  );
  addVendorContract(
    "v_gc",
    gcName,
    "gc",
    contract(
      "C-GC-01",
      `Prime GC — ${gcName.split(" ")[0]}`,
      gcName,
      "v_gc",
      "Prime (lump sum + allowances)",
      gcDivs.length ? gcDivs : ["01"],
      meta.phase === "precon" ? 0 : 1,
    ),
  );
  // Second contract under same GC vendor — enables P3 cross-contract vendor logs
  addVendorContract(
    "v_gc",
    gcName,
    "gc",
    contract(
      "C-GC-ALW",
      `GC allowances / general conditions — ${gcName.split(" ")[0]}`,
      gcName,
      "v_gc",
      "Allowance schedule",
      ["01"],
      meta.phase === "precon" ? 0 : 1,
    ),
  );

  if (divCodes.some((c) => ["31", "32", "33"].includes(c))) {
    addVendorContract(
      "v_civil",
      civilName,
      "trade",
      contract(
        "C-CIV-02",
        "Site civil & utilities",
        civilName,
        "v_civil",
        "Unit price + allowance",
        ["31", "32", "33"].filter((c) => divCodes.includes(c)),
        2,
      ),
    );
  }

  if (divCodes.includes("ENV")) {
    addVendorContract(
      "v_env",
      envName,
      "env",
      contract(
        "C-ENV-03",
        "Env compliance & monitoring",
        envName,
        "v_env",
        "T&M not-to-exceed",
        ["ENV"],
        0,
      ),
    );
  }

  if (divCodes.some((c) => ["22", "23"].includes(c))) {
    addVendorContract(
      "v_mep",
      mepName,
      "trade",
      contract(
        "C-MEP-04",
        "Mechanical / plumbing",
        mepName,
        "v_mep",
        "Design-assist fixed",
        ["22", "23"].filter((c) => divCodes.includes(c)),
        4,
      ),
    );
  }

  if (divCodes.includes("26")) {
    const elName = pick(MEP_FIRMS, h, 12);
    addVendorContract(
      "v_elec",
      elName,
      "trade",
      contract(
        "C-EL-05",
        "Electrical & fit-out",
        elName,
        "v_elec",
        "Fixed + equipment",
        ["26"],
        3,
      ),
    );
  }

  if (divCodes.some((c) => ["03", "05"].includes(c))) {
    addVendorContract(
      "v_struct",
      structName,
      "trade",
      contract(
        "C-STR-06",
        "Foundations & structural shell",
        structName,
        "v_struct",
        "Fixed",
        ["03", "05"].filter((c) => divCodes.includes(c)),
        2,
      ),
    );
  }

  if (divCodes.includes("LS") || divCodes.includes("21")) {
    const lsName = `LifeSafe ${meta.stateCode} Consulting`;
    addVendorContract(
      "v_ls",
      lsName,
      "consultant",
      contract(
        "C-LS-07",
        "Life safety / fire protection consult",
        lsName,
        "v_ls",
        "T&M NTE",
        ["LS", "21"].filter((c) => divCodes.includes(c)),
        3,
      ),
    );
  }

  return {
    version: 1,
    projectId: meta.id,
    people,
    divisions,
    contracts,
    vendors,
    generatedAt: new Date().toISOString(),
  };
}

/** Validate org against P1 hard rules — shared by harness and UI. */
export function validateProjectOrg(org: ProjectOrg | null | undefined): {
  ok: boolean;
  checks: Array<{ id: string; ok: boolean; detail: string }>;
} {
  const checks: Array<{ id: string; ok: boolean; detail: string }> = [];
  if (!org) {
    return {
      ok: false,
      checks: [{ id: "P1.0", ok: false, detail: "org missing" }],
    };
  }

  const divOk = Array.isArray(org.divisions) && org.divisions.length >= 3;
  checks.push({
    id: "P1.1",
    ok: divOk,
    detail: divOk
      ? `divisions=${org.divisions.length}`
      : "need ≥3 divisions (incl. core)",
  });

  const coreOk =
    org.divisions.some((d) => d.code === "01") &&
    org.divisions.some((d) => d.code === "AHJ") &&
    org.divisions.some((d) => d.code === "BD");
  checks.push({
    id: "P1.1b",
    ok: coreOk,
    detail: coreOk ? "core 01/AHJ/BD present" : "missing core divisions",
  });

  const cOk = Array.isArray(org.contracts) && org.contracts.length >= 2;
  checks.push({
    id: "P1.2",
    ok: cOk,
    detail: cOk
      ? `contracts=${org.contracts.length}`
      : "need ≥2 contracts (prime + owner/trade)",
  });

  const prime = org.contracts.some(
    (c) => c.id.startsWith("C-GC") || c.vendorId === "v_gc",
  );
  const owner = org.contracts.some(
    (c) => c.id.startsWith("C-OWN") || c.vendorId === "v_owner",
  );
  checks.push({
    id: "P1.2b",
    ok: prime && owner,
    detail:
      prime && owner
        ? "prime GC + owner soft cost"
        : `prime=${prime} owner=${owner}`,
  });

  const contractShape = org.contracts.every(
    (c) =>
      c.id &&
      c.name &&
      c.contractor &&
      Array.isArray(c.divisions) &&
      c.divisions.length > 0 &&
      typeof c.noticeToProceedMonth === "number" &&
      c.status,
  );
  checks.push({
    id: "P1.3",
    ok: contractShape,
    detail: contractShape
      ? "contracts shaped"
      : "contract missing divisions/contractor/status/NTP",
  });

  const peopleOk = Array.isArray(org.people) && org.people.length >= 4;
  checks.push({
    id: "P1.4",
    ok: peopleOk,
    detail: peopleOk ? `people=${org.people.length}` : "need ≥4 people",
  });

  const roles = new Set(org.people.map((p) => p.roleId));
  const roleOk =
    roles.has("super") &&
    roles.has("owner") &&
    roles.has("bd") &&
    roles.has("inspector");
  checks.push({
    id: "P1.4b",
    ok: roleOk,
    detail: roleOk
      ? "super/owner/bd/inspector present"
      : "missing required roles",
  });

  const leadsOk = org.divisions.every((d) =>
    org.people.some((p) => p.id === d.leadId),
  );
  checks.push({
    id: "P1.4c",
    ok: leadsOk,
    detail: leadsOk ? "division leads resolve" : "orphan division leadId",
  });

  const ntpOk = org.contracts.every(
    (c) =>
      typeof c.noticeToProceedMonth === "number" &&
      c.noticeToProceedMonth >= 0 &&
      c.status,
  );
  checks.push({
    id: "P1.5",
    ok: ntpOk,
    detail: ntpOk ? "NTP + status on all contracts" : "NTP/status missing",
  });

  const vendorsOk =
    Array.isArray(org.vendors) &&
    org.vendors.length >= 2 &&
    org.vendors.every((v) => v.contractIds.length > 0);
  checks.push({
    id: "P1.6",
    ok: vendorsOk,
    detail: vendorsOk
      ? `vendors=${org.vendors.length}`
      : "vendors missing or unlinked",
  });

  return { ok: checks.every((c) => c.ok), checks };
}

// Re-export type aliases for project-org-types consumers
export type { ProjectOrg as ProjectOrgBundle };
