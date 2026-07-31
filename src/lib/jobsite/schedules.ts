/**
 * Basic US construction schedules by industry type.
 * Day offsets from project start — field-editable after load.
 * Not a CPM engine; a practical starter board for each project type.
 */

import type { TradeDivision } from "./types";

export type ConstructionIndustry =
  | "single_family"
  | "multi_family"
  | "commercial"
  | "industrial"
  | "civil"
  | "renovation"
  | "hospitality"
  | "healthcare"
  | "education";

export interface IndustryInfo {
  id: ConstructionIndustry;
  label: string;
  short: string;
  description: string;
}

export const CONSTRUCTION_INDUSTRIES: IndustryInfo[] = [
  {
    id: "single_family",
    label: "Single-family residential",
    short: "SFR",
    description: "Detached house / townhome path under IRC-style sequence.",
  },
  {
    id: "multi_family",
    label: "Multi-family residential",
    short: "MF",
    description: "Apartments / condos — stacked floors, MEP rough, life safety.",
  },
  {
    id: "commercial",
    label: "Commercial (office / retail)",
    short: "Com",
    description: "Shell + TI path, IBC occupancy, accessibility, fire.",
  },
  {
    id: "industrial",
    label: "Industrial / warehouse",
    short: "Ind",
    description: "Slab-heavy, tilt-up or steel, racking, process utilities.",
  },
  {
    id: "civil",
    label: "Civil / site infrastructure",
    short: "Civil",
    description: "Sitework, utilities, paving, drainage — SWQ heavy.",
  },
  {
    id: "renovation",
    label: "Renovation / tenant improvement",
    short: "TI",
    description: "Demo, selective rough, finishes — occupied-site cautions.",
  },
  {
    id: "hospitality",
    label: "Hospitality",
    short: "Hosp",
    description: "Guest rooms, FF&E, kitchen, life safety, phased floors.",
  },
  {
    id: "healthcare",
    label: "Healthcare",
    short: "HC",
    description: "ICRA/ILSM mindset, medical gas, infection control holds.",
  },
  {
    id: "education",
    label: "Education / public",
    short: "Edu",
    description: "Schools / civic — phased occupancy, accessibility, AV.",
  },
];

export function industryLabel(id: ConstructionIndustry | undefined): string {
  return CONSTRUCTION_INDUSTRIES.find((x) => x.id === id)?.label ?? "Not set";
}

export interface ScheduleTemplateTask {
  title: string;
  division: TradeDivision;
  /** Days from project start */
  startOffset: number;
  durationDays: number;
  milestone?: boolean;
  notes?: string;
}

export interface MaterialTemplateLine {
  name: string;
  division: TradeDivision;
  unit: string;
  qtyRequired: number;
  /** Budget unit cost USD — edit to match contract */
  unitCost: number;
  specNote: string;
  /** Match schedule task title fragment for auto-link */
  scheduleTitleIncludes?: string;
}

export interface IndustryScheduleTemplate {
  industry: ConstructionIndustry;
  typicalDurationDays: number;
  tasks: ScheduleTemplateTask[];
  materials: MaterialTemplateLine[];
  typicalInspections: string[];
}

function T(
  title: string,
  division: TradeDivision,
  startOffset: number,
  durationDays: number,
  notes?: string,
  milestone?: boolean,
): ScheduleTemplateTask {
  return { title, division, startOffset, durationDays, notes, milestone };
}

function M(
  name: string,
  division: TradeDivision,
  unit: string,
  qty: number,
  unitCost: number,
  specNote: string,
  scheduleTitleIncludes?: string,
): MaterialTemplateLine {
  return {
    name,
    division,
    unit,
    qtyRequired: qty,
    unitCost,
    specNote,
    scheduleTitleIncludes,
  };
}

/** Shared early site sequence used by most vertical building types */
const SITE_FRONT: ScheduleTemplateTask[] = [
  T("Notice to proceed / kickoff", "general", 0, 0, "Contract start", true),
  T("Mobilization & temp facilities", "general", 0, 5, "Trailers, fence, temp power"),
  T("Erosion control / SWPPP install", "sitework", 1, 4, "SWQ BMPs before ground disturb"),
  T("Site clearing & rough grade", "sitework", 3, 8),
  T("Underground utilities", "sitework", 8, 12, "Water, sewer, storm, dry utilities"),
];

const FOUNDATION_BLOCK: ScheduleTemplateTask[] = [
  T("Footings / foundation dig", "concrete", 18, 6),
  T("Rebar & forms", "concrete", 22, 5),
  T("Foundation / slab pour", "concrete", 26, 4),
  T("Foundation inspection hold", "concrete", 28, 0, "AHJ hold point", true),
];

const CLOSEOUT: ScheduleTemplateTask[] = [
  T("Punch list", "general", 0, 10, "Offset adjusted at load"),
  T("Final cleaning", "general", 5, 3),
  T("Certificate of occupancy path", "general", 8, 0, "AHJ CO / TCO", true),
  T("Owner turnover / O&M", "general", 10, 3),
];

function withCloseout(
  tasks: ScheduleTemplateTask[],
  endDay: number,
): ScheduleTemplateTask[] {
  return [
    ...tasks,
    ...CLOSEOUT.map((t) => ({
      ...t,
      startOffset: endDay + t.startOffset,
    })),
  ];
}

export const INDUSTRY_SCHEDULES: Record<
  ConstructionIndustry,
  IndustryScheduleTemplate
> = {
  single_family: {
    industry: "single_family",
    typicalDurationDays: 120,
    typicalInspections: [
      "Footing / foundation",
      "Slab",
      "Framing / shear",
      "Rough plumbing",
      "Rough electrical",
      "Rough mechanical",
      "Insulation",
      "Final",
    ],
    tasks: withCloseout(
      [
        ...SITE_FRONT,
        ...FOUNDATION_BLOCK,
        T("Framing", "carpentry", 32, 14),
        T("Roof dry-in", "roofing", 42, 6),
        T("Windows / exterior doors", "carpentry", 44, 5),
        T("MEP rough-in", "mechanical", 48, 12),
        T("Insulation", "drywall", 60, 4),
        T("Drywall", "drywall", 64, 10),
        T("Interior finishes", "paint", 74, 14),
        T("Flooring", "flooring", 82, 8),
        T("Final MEP trim", "electrical", 88, 6),
        T("Final grade & driveway", "sitework", 90, 8),
      ],
      100,
    ),
    materials: [
      M("Concrete (foundations/slab)", "concrete", "cy", 45, 165, "Spec Division 03 — mix design per structural", "Foundation"),
      M("Dimensional lumber package", "carpentry", "ls", 1, 18500, "Spec Division 06 — grade stamps required", "Framing"),
      M("Roof underlayment + shingles", "roofing", "sq", 28, 95, "Manufacturer approved for wind zone", "Roof"),
      M("Electrical rough materials", "electrical", "ls", 1, 4200, "NEC-compliant; copper conductors per spec", "MEP"),
      M("Plumbing rough package", "plumbing", "ls", 1, 3800, "IPC / local amendments; DWV + supply", "MEP"),
      M("HVAC equipment set", "mechanical", "ea", 2, 3200, "SEER / tonnage per mechanical schedule", "MEP"),
      M("Insulation (walls + attic)", "drywall", "sf", 4500, 1.15, "R-values per energy code path", "Insulation"),
      M("Drywall sheets 1/2 in", "drywall", "ea", 220, 14.5, "Type X where rated assemblies required", "Drywall"),
    ],
  },
  multi_family: {
    industry: "multi_family",
    typicalDurationDays: 280,
    typicalInspections: [
      "Stormwater / site drainage",
      "Foundation / podium",
      "Framing by floor",
      "MEP rough-in by floor",
      "Fire / life safety",
      "Insulation",
      "Final by building",
    ],
    tasks: withCloseout(
      [
        ...SITE_FRONT,
        ...FOUNDATION_BLOCK,
        T("Podium / structure", "concrete", 32, 30),
        T("Framing — Building A", "carpentry", 55, 40),
        T("MEP rough-in — lower floors", "mechanical", 70, 35),
        T("MEP rough-in — upper floors", "electrical", 90, 35),
        T("Exterior envelope / cladding", "waterproofing", 100, 40),
        T("Roofing", "roofing", 120, 15),
        T("Fire protection rough", "fire_protection", 95, 25),
        T("Drywall & interiors", "drywall", 140, 45),
        T("Unit finishes", "paint", 170, 40),
        T("Common areas / amenities", "flooring", 190, 25),
        T("Site hardscape & parking", "sitework", 200, 30),
        T("Life safety testing", "fire_protection", 230, 10, "Alarm / sprinkler final path"),
      ],
      250,
    ),
    materials: [
      M("Structural concrete", "concrete", "cy", 800, 155, "Mix designs per structural eng", "Podium"),
      M("Framing lumber / engineered wood", "carpentry", "ls", 1, 420000, "Floor packages by building", "Framing"),
      M("Curtain wall / window packages", "glazing", "ls", 1, 185000, "Shop drawings approved before fab", "envelope"),
      M("MEP rough materials (by floor)", "mechanical", "fl", 5, 28000, "Per floor kit — hold until rough ready", "MEP"),
      M("Fire sprinkler materials", "fire_protection", "ls", 1, 95000, "NFPA 13; approved drawings", "Fire"),
      M("Unit appliance packages", "materials", "unit", 120, 2100, "Owner allowance — contract Exhibit B", "Unit finishes"),
      M("Corridor flooring", "flooring", "sf", 18000, 4.25, "Specified product; no substitutions without RFI", "Common"),
    ],
  },
  commercial: {
    industry: "commercial",
    typicalDurationDays: 240,
    typicalInspections: [
      "Foundation",
      "Structural steel / framing",
      "Deck / slab",
      "MEP rough",
      "Fire / life safety",
      "Envelope",
      "Final / CO",
    ],
    tasks: withCloseout(
      [
        ...SITE_FRONT,
        ...FOUNDATION_BLOCK,
        T("Structural steel erect", "steel", 32, 25),
        T("Metal deck & slab on deck", "concrete", 50, 15),
        T("Exterior envelope", "waterproofing", 60, 35),
        T("Roofing", "roofing", 70, 12),
        T("MEP rough-in", "mechanical", 65, 40),
        T("Fire protection", "fire_protection", 75, 30),
        T("Interior framing & drywall", "drywall", 100, 35),
        T("Ceilings & finishes", "paint", 130, 30),
        T("Flooring", "flooring", 145, 20),
        T("Sitework finish & parking", "sitework", 150, 25),
        T("Commissioning", "mechanical", 175, 15),
      ],
      200,
    ),
    materials: [
      M("Structural steel package", "steel", "ton", 180, 3200, "AISC; mill certs required", "Structural steel"),
      M("Metal deck", "steel", "sf", 45000, 3.8, "Gage per structural", "deck"),
      M("Curtain wall system", "glazing", "sf", 12000, 85, "Performance mock-up if specified", "envelope"),
      M("RTU / HVAC equipment", "mechanical", "ea", 8, 14500, "Submittal approved before order", "MEP"),
      M("Electrical switchgear", "electrical", "ls", 1, 78000, "Utility coordination; long lead", "MEP"),
      M("Fire alarm devices", "fire_protection", "ls", 1, 42000, "Listed devices; shop drawings", "Fire"),
      M("ACT ceiling tile", "drywall", "sf", 38000, 2.1, "NRC rating per interiors", "Ceilings"),
    ],
  },
  industrial: {
    industry: "industrial",
    typicalDurationDays: 200,
    typicalInspections: [
      "Foundation / piers",
      "Slab",
      "Structural / tilt panels",
      "Roof",
      "Fire protection",
      "Final",
    ],
    tasks: withCloseout(
      [
        ...SITE_FRONT,
        T("Deep foundations / piers", "concrete", 15, 12),
        T("Grade beams & slab", "concrete", 25, 18),
        T("Tilt-up / structural shell", "concrete", 40, 30),
        T("Roof structure & membrane", "roofing", 65, 15),
        T("Dock equipment", "steel", 75, 12),
        T("Process utilities", "mechanical", 70, 35),
        T("Electrical / power distribution", "electrical", 70, 35),
        T("Fire protection high-pile", "fire_protection", 80, 25),
        T("Office build-out", "drywall", 100, 25),
        T("Paving & truck courts", "sitework", 110, 20),
        T("Racking / owner equipment", "materials", 120, 15),
      ],
      160,
    ),
    materials: [
      M("Industrial slab concrete", "concrete", "cy", 2200, 148, "FF/FL tolerances per spec", "slab"),
      M("Tilt panels / rebar", "concrete", "ls", 1, 520000, "Shop drawings stamped", "Tilt"),
      M("Roof membrane system", "roofing", "sf", 120000, 4.5, "Manufacturer warranty path", "Roof"),
      M("Dock levelers", "steel", "ea", 24, 8500, "Capacity per logistics plan", "Dock"),
      M("High-pile sprinkler materials", "fire_protection", "ls", 1, 210000, "Commodity class driven design", "Fire"),
      M("Switchgear / transformers", "electrical", "ls", 1, 165000, "Long lead — order at NTP", "Electrical"),
    ],
  },
  civil: {
    industry: "civil",
    typicalDurationDays: 160,
    typicalInspections: [
      "Erosion control",
      "Utility trenches",
      "Storm structures",
      "Subgrade",
      "Base / paving",
      "Final SWQ",
    ],
    tasks: withCloseout(
      [
        T("Notice to proceed", "general", 0, 0, undefined, true),
        T("SWPPP / erosion control", "sitework", 0, 5),
        T("Clearing & grubbing", "sitework", 3, 10),
        T("Mass grading", "sitework", 10, 25),
        T("Storm drainage system", "sitework", 20, 30),
        T("Water & sewer mains", "plumbing", 25, 30),
        T("Dry utilities (joint trench)", "electrical", 35, 25),
        T("Curb & gutter", "sitework", 55, 15),
        T("Base course", "sitework", 65, 12),
        T("Paving", "sitework", 75, 15),
        T("Striping & signage", "sitework", 90, 8),
        T("Landscaping & irrigation", "sitework", 95, 15),
        T("Final SWQ / punch", "sitework", 110, 10),
      ],
      125,
    ),
    materials: [
      M("Import fill", "sitework", "cy", 5000, 28, "Geotech approved source", "grading"),
      M("Storm pipe (RCP/HDPE)", "sitework", "lf", 2400, 85, "Class per civil drawings", "Storm"),
      M("Water main materials", "plumbing", "lf", 1800, 95, "Utility standards; disinfect per AHJ", "Water"),
      M("Aggregate base", "sitework", "ton", 3200, 32, "Gradation per pavement section", "Base"),
      M("Asphalt", "sitework", "ton", 2800, 95, "Mix design approved", "Paving"),
      M("Erosion control BMPs", "sitework", "ls", 1, 18500, "SWPPP map quantities", "SWPPP"),
    ],
  },
  renovation: {
    industry: "renovation",
    typicalDurationDays: 90,
    typicalInspections: [
      "Demo / abatement clear",
      "Rough MEP",
      "Framing / blocking",
      "Insulation",
      "Final",
    ],
    tasks: withCloseout(
      [
        T("Preconstruction survey", "general", 0, 3),
        T("Selective demolition", "general", 3, 10),
        T("Abatement (if required)", "general", 5, 8, "Clearance before re-occupy path"),
        T("Structural repairs", "steel", 12, 10),
        T("MEP rough in existing", "mechanical", 15, 20),
        T("New partitions", "drywall", 25, 12),
        T("Finishes", "paint", 35, 18),
        T("Flooring", "flooring", 45, 10),
        T("FF&E / owner items", "materials", 50, 10),
        T("Commission & training", "general", 60, 5),
      ],
      70,
    ),
    materials: [
      M("Demo dumpsters / haul", "general", "ea", 12, 650, "Waste plan per contract", "demolition"),
      M("Metal studs & track", "drywall", "lf", 4000, 1.85, "Gage per drawings", "partitions"),
      M("MEP rough retrofit kit", "mechanical", "ls", 1, 24000, "Match existing systems; as-builts", "MEP"),
      M("Paint system", "paint", "gal", 80, 42, "Specified product; low-VOC if occupied", "Finishes"),
      M("Flooring material", "flooring", "sf", 8500, 5.5, "Owner selection locked before order", "Flooring"),
    ],
  },
  hospitality: {
    industry: "hospitality",
    typicalDurationDays: 300,
    typicalInspections: [
      "Foundation",
      "Structure",
      "MEP rough by floor",
      "Life safety",
      "Kitchen / health",
      "Final / CO",
    ],
    tasks: withCloseout(
      [
        ...SITE_FRONT,
        ...FOUNDATION_BLOCK,
        T("Structure", "concrete", 32, 40),
        T("Envelope", "waterproofing", 70, 35),
        T("MEP rough by floor", "mechanical", 80, 50),
        T("Guest room rough & finishes", "drywall", 120, 60),
        T("Kitchen / BOH", "mechanical", 150, 35),
        T("FF&E install", "materials", 180, 30),
        T("Life safety testing", "fire_protection", 210, 12),
        T("Soft opening prep", "general", 230, 15),
      ],
      260,
    ),
    materials: [
      M("Guest room FF&E package", "materials", "room", 180, 8500, "Procurement schedule locked to finishes", "FF&E"),
      M("Kitchen equipment", "mechanical", "ls", 1, 320000, "Health dept submittals", "Kitchen"),
      M("Corridor carpet", "flooring", "sy", 2200, 38, "Specified; no equal without RFI", "Guest room"),
      M("Fire alarm / voice evac", "fire_protection", "ls", 1, 125000, "Listed system; shop drawings", "Life safety"),
    ],
  },
  healthcare: {
    industry: "healthcare",
    typicalDurationDays: 320,
    typicalInspections: [
      "Infection control plan review",
      "Foundation",
      "Structure",
      "Medical gas",
      "MEP rough",
      "Above-ceiling",
      "Life safety",
      "Final / licensing path",
    ],
    tasks: withCloseout(
      [
        T("ICRA / ILSM planning", "general", 0, 5, "Infection control risk assessment"),
        ...SITE_FRONT.slice(1),
        ...FOUNDATION_BLOCK,
        T("Structure", "steel", 35, 35),
        T("MEP infrastructure", "mechanical", 65, 55),
        T("Medical gas systems", "plumbing", 90, 40),
        T("Clean finishes path", "drywall", 130, 50),
        T("Imaging / specialty rooms", "electrical", 160, 35),
        T("Commissioning (Cx)", "mechanical", 200, 25),
        T("Licensing / AHJ walk", "general", 230, 10, undefined, true),
      ],
      260,
    ),
    materials: [
      M("Medical gas outlets & zone valves", "plumbing", "ls", 1, 95000, "NFPA 99; certified installers", "Medical gas"),
      M("Cleanroom / clinical finishes", "drywall", "sf", 25000, 12, "ICRA-compatible products", "Clean finishes"),
      M("Nurse call system", "electrical", "ls", 1, 140000, "Listed; owner IT coordination", "specialty"),
      M("HVAC filtration upgrades", "mechanical", "ls", 1, 68000, "Air change rates per program", "MEP"),
    ],
  },
  education: {
    industry: "education",
    typicalDurationDays: 260,
    typicalInspections: [
      "Foundation",
      "Structure",
      "MEP rough",
      "Life safety",
      "Play / site",
      "Final / CO",
    ],
    tasks: withCloseout(
      [
        ...SITE_FRONT,
        ...FOUNDATION_BLOCK,
        T("Structure", "steel", 32, 30),
        T("Envelope", "waterproofing", 60, 30),
        T("MEP rough", "mechanical", 70, 40),
        T("Classrooms build-out", "drywall", 110, 40),
        T("Specialized labs / shops", "electrical", 130, 30),
        T("Gym / multipurpose", "steel", 100, 35),
        T("Site play & paving", "sitework", 150, 25),
        T("AV / low voltage", "electrical", 160, 20),
        T("Commissioning", "mechanical", 180, 15),
      ],
      210,
    ),
    materials: [
      M("Classroom casework", "carpentry", "room", 40, 4200, "Owner standards; durability grade", "Classrooms"),
      M("Gym floor system", "flooring", "sf", 12000, 14, "Manufacturer certified install", "Gym"),
      M("Play equipment (if in contract)", "sitework", "ls", 1, 85000, "ASTM / accessibility", "play"),
      M("Fire alarm campus", "fire_protection", "ls", 1, 110000, "Voice / mass notification if required", "Life safety"),
    ],
  },
};

export function getIndustryTemplate(
  industry: ConstructionIndustry,
): IndustryScheduleTemplate {
  return INDUSTRY_SCHEDULES[industry];
}
