/**
 * Multi-project workspace types for Jobsite (device-local portfolio).
 * Sync / lock / cross-project lists live on top of a single active Jobsite board.
 */

import type { ConstructionIndustry, Jobsite } from "./types";

/** Regional / site environmental conditions that shape field risk. */
export type EnvCondition =
  | "coastal_hurricane"
  | "coastal_flood"
  | "desert_heat"
  | "high_altitude"
  | "freeze_thaw"
  | "seismic"
  | "wildfire_wui"
  | "tornado_alley"
  | "urban_dense"
  | "wetland_swq"
  | "cold_winter"
  | "humid_subtropical"
  | "volcanic_island"
  | "permafrost_edge"
  | "lake_effect_snow"
  | "expansive_soil"
  | "high_wind_plain"
  | "karst_sinkhole";

/** Shared interest tags for cross-project lists / templates. */
export type InterestTag =
  | "life_safety"
  | "stormwater"
  | "steel_structure"
  | "tilt_up"
  | "modular"
  | "occupied_site"
  | "public_funding"
  | "net_zero"
  | "historic"
  | "high_rise"
  | "logistics"
  | "healthcare_icra"
  | "education_phased"
  | "hospitality_ffe"
  | "civil_utilities"
  | "envelope"
  | "foundation_deep"
  | "crane_picks"
  | "night_work"
  | "union_labor";

export const ENV_LABELS: Record<EnvCondition, string> = {
  coastal_hurricane: "Coastal / hurricane wind",
  coastal_flood: "Coastal flood / surge",
  desert_heat: "Desert heat / UV",
  high_altitude: "High altitude",
  freeze_thaw: "Freeze–thaw cycles",
  seismic: "Seismic",
  wildfire_wui: "Wildfire WUI",
  tornado_alley: "Tornado / severe wind",
  urban_dense: "Dense urban",
  wetland_swq: "Wetland / stormwater",
  cold_winter: "Deep cold winter",
  humid_subtropical: "Humid subtropical",
  volcanic_island: "Volcanic / island",
  permafrost_edge: "Permafrost edge",
  lake_effect_snow: "Lake-effect snow",
  expansive_soil: "Expansive soils",
  high_wind_plain: "High-wind plain",
  karst_sinkhole: "Karst / sinkhole risk",
};

export const INTEREST_LABELS: Record<InterestTag, string> = {
  life_safety: "Life safety",
  stormwater: "Stormwater / SWQ",
  steel_structure: "Steel structure",
  tilt_up: "Tilt-up",
  modular: "Modular / prefab",
  occupied_site: "Occupied site",
  public_funding: "Public funding",
  net_zero: "Net-zero / energy",
  historic: "Historic fabric",
  high_rise: "High-rise",
  logistics: "Logistics / yard",
  healthcare_icra: "Healthcare ICRA",
  education_phased: "Education phased",
  hospitality_ffe: "Hospitality FF&E",
  civil_utilities: "Civil utilities",
  envelope: "Envelope",
  foundation_deep: "Deep foundation",
  crane_picks: "Crane picks",
  night_work: "Night work",
  union_labor: "Union labor",
};

/** Lightweight catalog row (always available for pickers / lists). */
export interface ProjectMeta {
  id: string;
  name: string;
  city: string;
  stateCode: string;
  industry: ConstructionIndustry;
  env: EnvCondition[];
  interests: InterestTag[];
  phase: "precon" | "foundation" | "structure" | "envelope" | "mep" | "finish" | "closeout";
  /** Approx pin for map */
  lat: number;
  lon: number;
  permitOffice: string;
  captain: string;
  /** One-line field note */
  blurb: string;
  materialsBudget?: number;
  /** Days before today for projectStartDate */
  startOffsetDays: number;
}

/** Saved cross-project list or template (device-local). */
export interface ProjectList {
  id: string;
  name: string;
  description?: string;
  /** Manual membership */
  projectIds: string[];
  /** Auto-match rules (OR within field, AND across fields when set) */
  match?: {
    industries?: ConstructionIndustry[];
    env?: EnvCondition[];
    interests?: InterestTag[];
    stateCodes?: string[];
  };
  /** Built-in seed lists cannot be deleted */
  builtIn?: boolean;
  updatedAt: string;
}

export interface PortfolioState {
  version: 1;
  /** Full boards keyed by id */
  projects: Record<string, Jobsite>;
  /** Meta index for fast filters (mirrors project identity + tags) */
  meta: Record<string, ProjectMeta>;
  lists: ProjectList[];
  /** Shared active project across unlocked windows */
  activeProjectId: string;
  seedVersion: number;
  updatedAt: string;
}

export type ProjectSyncMessage =
  | {
      type: "active-changed";
      projectId: string;
      sourceWindowId: string;
      at: string;
    }
  | {
      type: "project-patched";
      projectId: string;
      sourceWindowId: string;
      at: string;
    }
  | {
      type: "lists-changed";
      sourceWindowId: string;
      at: string;
    }
  | {
      type: "portfolio-reseeded";
      sourceWindowId: string;
      at: string;
    };
