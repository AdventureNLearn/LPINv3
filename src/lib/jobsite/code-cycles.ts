/**
 * State building-code adoption cycle metadata.
 * Guidance only — not a live adoption tracker or legal advice.
 * Used to surface honest staleness signals without requiring a full app update.
 * Refreshable packs under public/packs/ can overlay these shipped baselines.
 */

export interface StateCodeCycleMeta {
  stateCode: string;
  /** Typical review cadence in years; null = pure home-rule / variable local only */
  typicalCycleYears: number | null;
  /** Last known effective edition label (guidance) */
  modelBase?: string;
  /** ISO date or year string of last known statewide effective date */
  lastKnownEffective?: string;
  /** Human window for the next expected cycle (or pause note) */
  nextExpectedWindow?: string;
  packVersion: string;
  notes: string[];
  sourceHint?: string;
}

/**
 * Shipped cycle map for all US states + DC.
 * Edition years move; process patterns below are relatively stable.
 * Device-cached packs from /packs/ may overlay when newer.
 */
export const STATE_CODE_CYCLES: Record<string, StateCodeCycleMeta> = {
  AK: {
    stateCode: "AK",
    typicalCycleYears: 3,
    modelBase: "Alaska Building Codes (I-Codes based)",
    nextExpectedWindow: "State code cycle; cold-climate provisions material",
    packVersion: "1.0.0",
    notes: [
      "Alaska uses statewide codes with local administration; cold climate and seismic paths are frequently material.",
      "Confirm the current edition and local amendments with the AHJ."
    ],
    sourceHint: "State fire marshal / local AHJ",
  },
  AL: {
    stateCode: "AL",
    typicalCycleYears: 3,
    modelBase: "Alabama Building Codes (I-Codes based)",
    nextExpectedWindow: "Statewide code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Alabama maintains statewide building codes based on the I-Codes with local administration.",
      "Confirm the current adopted edition with the local building department."
    ],
    sourceHint: "State building commission / local AHJ",
  },
  AR: {
    stateCode: "AR",
    typicalCycleYears: 3,
    modelBase: "Arkansas Fire Prevention Code / I-Codes as adopted",
    nextExpectedWindow: "State minimum codes with local admin",
    packVersion: "1.0.0",
    notes: [
      "Arkansas publishes statewide code paths with local enforcement.",
      "Confirm the current edition with the local department."
    ],
    sourceHint: "State / local AHJ",
  },
  AZ: {
    stateCode: "AZ",
    typicalCycleYears: null,
    modelBase: "Local adoption of model codes",
    nextExpectedWindow: "Local only \u2014 varies by municipality",
    packVersion: "1.0.0",
    notes: [
      "Arizona is primarily local adoption for private construction.",
      "Confirm the city or county adopted edition and amendments."
    ],
    sourceHint: "Local municipal / county building department",
  },
  CA: {
    stateCode: "CA",
    typicalCycleYears: 3,
    modelBase: "California Building Standards Code (Title 24) \u2014 2025 edition",
    lastKnownEffective: "2026-01-01",
    nextExpectedWindow: "Residential code changes largely paused through ~June 2031 (except emergencies / wildfire mitigation)",
    packVersion: "1.0.3",
    notes: [
      "California uses statewide Title 24 with local administration and amendments.",
      "Recent legislation paused most residential code changes through approximately June 2031.",
      "Always verify current Title 24 parts and local amendments with the AHJ."
    ],
    sourceHint: "California Building Standards Commission",
  },
  CO: {
    stateCode: "CO",
    typicalCycleYears: null,
    modelBase: "Local adoption with state influence on some occupancies",
    nextExpectedWindow: "Local only \u2014 varies by municipality",
    packVersion: "1.0.0",
    notes: [
      "Colorado is largely local AHJ adoption; snow load and energy vary by elevation.",
      "Local amendments vary by municipality — confirm with the local AHJ."
    ],
    sourceHint: "Local municipal AHJ",
  },
  CT: {
    stateCode: "CT",
    typicalCycleYears: 3,
    modelBase: "Connecticut State Building Code (I-Codes based)",
    nextExpectedWindow: "Statewide code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Connecticut maintains a statewide building code with local administration.",
      "Confirm the current edition and any local amendments."
    ],
    sourceHint: "Office of the State Building Inspector / local AHJ",
  },
  DC: {
    stateCode: "DC",
    typicalCycleYears: 3,
    modelBase: "DC Construction Codes",
    nextExpectedWindow: "District code update cycle under DCRA",
    packVersion: "1.0.0",
    notes: [
      "The District maintains its own construction codes under DCRA administration.",
      "Confirm the current edition with DCRA / the permit office."
    ],
    sourceHint: "DC Department of Buildings / DCRA",
  },
  DE: {
    stateCode: "DE",
    typicalCycleYears: 3,
    modelBase: "Delaware Building Codes (I-Codes based)",
    nextExpectedWindow: "State code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Delaware uses statewide codes with local administration.",
      "Confirm the current edition with the locality."
    ],
    sourceHint: "State / local AHJ",
  },
  FL: {
    stateCode: "FL",
    typicalCycleYears: 3,
    modelBase: "Florida Building Code (FBC) — 8th Edition (2023), based on 2021 I-Codes",
    lastKnownEffective: "2023-12-31",
    nextExpectedWindow: "9th Edition (2026) Florida Building Commission process — confirm effective date printed on the permit / with the AHJ",
    packVersion: "1.1.1",
    notes: [
      "Florida updates the statewide FBC through the Florida Building Commission on an approximately three-year cycle.",
      "Local building departments administer permits and inspections under the FBC; they do not each invent a separate statewide code.",
      "Where HVHZ applies, product-approval rules stack on top of the base FBC path — confirm with the local AHJ.",
      "Always confirm the edition year and any local administrative procedures before rough-in and envelope work.",
    ],
    sourceHint: "Florida Building Commission / local building department",
  },
  GA: {
    stateCode: "GA",
    typicalCycleYears: 3,
    modelBase: "Georgia State Minimum Standard Codes (based on I-Codes)",
    nextExpectedWindow: "State minimum codes with local admin",
    packVersion: "1.0.0",
    notes: [
      "Georgia publishes state minimum standard codes; locals administer and may amend.",
      "Confirm adopted edition and local amendments with the AHJ."
    ],
    sourceHint: "State / local AHJ",
  },
  HI: {
    stateCode: "HI",
    typicalCycleYears: 3,
    modelBase: "Hawaii State Building Code (I-Codes based)",
    nextExpectedWindow: "State code with county administration",
    packVersion: "1.0.0",
    notes: [
      "Hawaii maintains state building codes administered largely at the county level.",
      "Wind, seismic, and flood provisions are frequently material.",
      "Confirm the current county-adopted edition."
    ],
    sourceHint: "State Building Code Council / county AHJ",
  },
  IA: {
    stateCode: "IA",
    typicalCycleYears: 3,
    modelBase: "Iowa State Building Code (where applicable) / local I-Codes",
    nextExpectedWindow: "State and local paths vary by occupancy",
    packVersion: "1.0.0",
    notes: [
      "Iowa has a mix of state building code applicability and local adoption.",
      "Confirm which codes apply to your occupancy with the local AHJ."
    ],
    sourceHint: "State Building Code Bureau / local AHJ",
  },
  ID: {
    stateCode: "ID",
    typicalCycleYears: 3,
    modelBase: "Idaho Building Codes (I-Codes based)",
    nextExpectedWindow: "State code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Idaho uses statewide codes with local administration.",
      "Confirm the current edition with the local department."
    ],
    sourceHint: "Division of Building Safety / local AHJ",
  },
  IL: {
    stateCode: "IL",
    typicalCycleYears: null,
    modelBase: "Local adoption of model codes; some municipalities maintain distinct paths",
    nextExpectedWindow: "Local only \u2014 varies by municipality",
    packVersion: "1.0.0",
    notes: [
      "Most of Illinois is local adoption; some large municipalities maintain distinct code paths.",
      "Confirm the municipal adopted edition and amendments."
    ],
    sourceHint: "Local municipal AHJ",
  },
  IN: {
    stateCode: "IN",
    typicalCycleYears: 3,
    modelBase: "Indiana Building Codes (I-Codes based)",
    nextExpectedWindow: "Statewide code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Indiana maintains statewide building codes with local administration.",
      "Confirm the current edition with the local building department."
    ],
    sourceHint: "State / local AHJ",
  },
  KS: {
    stateCode: "KS",
    typicalCycleYears: null,
    modelBase: "Local adoption of model codes",
    nextExpectedWindow: "Local only \u2014 varies by municipality",
    packVersion: "1.0.0",
    notes: [
      "Kansas is primarily local adoption for building codes.",
      "Confirm the city or county adopted edition."
    ],
    sourceHint: "Local municipal / county AHJ",
  },
  KY: {
    stateCode: "KY",
    typicalCycleYears: 3,
    modelBase: "Kentucky Building Code / Residential Code",
    nextExpectedWindow: "Statewide code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Kentucky maintains statewide building and residential codes with local administration.",
      "Confirm the current edition with the local department."
    ],
    sourceHint: "Department of Housing, Buildings and Construction / local AHJ",
  },
  LA: {
    stateCode: "LA",
    typicalCycleYears: 3,
    modelBase: "Louisiana State Uniform Construction Code",
    nextExpectedWindow: "Statewide LSUCC cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Louisiana uses a statewide uniform construction code with local administration.",
      "Wind and flood provisions are frequently material on the coast.",
      "Confirm the current edition with the local AHJ."
    ],
    sourceHint: "State Uniform Construction Code Council / local AHJ",
  },
  MA: {
    stateCode: "MA",
    typicalCycleYears: 3,
    modelBase: "Massachusetts State Building Code (based on I-Codes)",
    nextExpectedWindow: "Statewide code; stretch energy where adopted",
    packVersion: "1.0.0",
    notes: [
      "Massachusetts maintains a statewide building code with local enforcement.",
      "Some municipalities adopt stretch energy provisions.",
      "Confirm current edition and any stretch path with the AHJ."
    ],
    sourceHint: "BBRS / local building department",
  },
  MD: {
    stateCode: "MD",
    typicalCycleYears: 3,
    modelBase: "Maryland Building Performance Standards (based on I-Codes)",
    nextExpectedWindow: "Statewide standards with local admin",
    packVersion: "1.0.0",
    notes: [
      "Maryland publishes statewide building performance standards with local administration and amendments.",
      "Confirm adopted edition and local amendments with the AHJ."
    ],
    sourceHint: "State / local AHJ",
  },
  ME: {
    stateCode: "ME",
    typicalCycleYears: 3,
    modelBase: "Maine Uniform Building and Energy Code (MUBEC)",
    nextExpectedWindow: "Statewide MUBEC with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Maine maintains MUBEC with local administration (some municipality size rules apply historically).",
      "Confirm the current edition and local enforcement status."
    ],
    sourceHint: "State / local AHJ",
  },
  MI: {
    stateCode: "MI",
    typicalCycleYears: 3,
    modelBase: "Michigan Building / Residential / Rehab codes",
    nextExpectedWindow: "Statewide code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Michigan maintains statewide construction codes with local administration.",
      "Confirm the current edition with the local department."
    ],
    sourceHint: "Bureau of Construction Codes / local AHJ",
  },
  MN: {
    stateCode: "MN",
    typicalCycleYears: 3,
    modelBase: "Minnesota State Building Code",
    nextExpectedWindow: "Statewide code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Minnesota maintains a statewide building code with local administration.",
      "Cold-climate energy and envelope paths are frequently material.",
      "Confirm the current edition with the AHJ."
    ],
    sourceHint: "Department of Labor and Industry / local AHJ",
  },
  MO: {
    stateCode: "MO",
    typicalCycleYears: null,
    modelBase: "Local adoption of model codes",
    nextExpectedWindow: "Local only \u2014 varies by municipality",
    packVersion: "1.0.0",
    notes: [
      "Missouri is primarily local adoption for building codes.",
      "Confirm the city or county adopted edition and amendments."
    ],
    sourceHint: "Local municipal / county AHJ",
  },
  MS: {
    stateCode: "MS",
    typicalCycleYears: 3,
    modelBase: "Mississippi Building Codes (I-Codes based)",
    nextExpectedWindow: "State code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Mississippi uses statewide codes with local administration.",
      "Confirm the current edition with the local building department."
    ],
    sourceHint: "State / local AHJ",
  },
  MT: {
    stateCode: "MT",
    typicalCycleYears: 3,
    modelBase: "Montana Building Codes (I-Codes based)",
    nextExpectedWindow: "State code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Montana maintains statewide codes with local administration.",
      "Confirm the current edition with the local department."
    ],
    sourceHint: "Department of Labor and Industry / local AHJ",
  },
  NC: {
    stateCode: "NC",
    typicalCycleYears: 3,
    modelBase: "North Carolina Building / Residential Codes (I-Codes based)",
    nextExpectedWindow: "Statewide codes with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "North Carolina maintains statewide codes with local enforcement; residential review cycles have lengthened in recent years.",
      "Confirm the current edition with the local department."
    ],
    sourceHint: "NC DOI / local AHJ",
  },
  ND: {
    stateCode: "ND",
    typicalCycleYears: 3,
    modelBase: "North Dakota Building Codes (I-Codes based)",
    nextExpectedWindow: "State code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "North Dakota uses statewide codes with local administration.",
      "Confirm the current edition with the local department."
    ],
    sourceHint: "State / local AHJ",
  },
  NE: {
    stateCode: "NE",
    typicalCycleYears: null,
    modelBase: "Local adoption of model codes",
    nextExpectedWindow: "Local only \u2014 varies by municipality",
    packVersion: "1.0.0",
    notes: [
      "Nebraska is primarily local adoption for building codes.",
      "Confirm the municipal adopted edition."
    ],
    sourceHint: "Local municipal AHJ",
  },
  NH: {
    stateCode: "NH",
    typicalCycleYears: 3,
    modelBase: "New Hampshire State Building Code",
    nextExpectedWindow: "Statewide code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "New Hampshire maintains a statewide building code with local administration.",
      "Confirm the current edition with the local department."
    ],
    sourceHint: "State Building Code Review Board / local AHJ",
  },
  NJ: {
    stateCode: "NJ",
    typicalCycleYears: 3,
    modelBase: "New Jersey Uniform Construction Code",
    nextExpectedWindow: "Statewide UCC with local construction officials",
    packVersion: "1.0.0",
    notes: [
      "New Jersey maintains a statewide UCC with local construction officials.",
      "Confirm current adopted editions with the municipality."
    ],
    sourceHint: "DCA / local construction official",
  },
  NM: {
    stateCode: "NM",
    typicalCycleYears: 3,
    modelBase: "New Mexico Building Codes (I-Codes based)",
    nextExpectedWindow: "Statewide code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "New Mexico maintains statewide building codes with local administration.",
      "Confirm the current edition with the local AHJ."
    ],
    sourceHint: "Construction Industries Division / local AHJ",
  },
  NV: {
    stateCode: "NV",
    typicalCycleYears: 3,
    modelBase: "Nevada Building Codes (I-Codes based) / local amendments",
    nextExpectedWindow: "State and local paths; confirm locality",
    packVersion: "1.0.0",
    notes: [
      "Nevada uses statewide code frameworks with significant local administration and amendments.",
      "Confirm the current edition with the city or county AHJ."
    ],
    sourceHint: "State / local AHJ",
  },
  NY: {
    stateCode: "NY",
    typicalCycleYears: 3,
    modelBase: "NYS Uniform Code (statewide framework)",
    nextExpectedWindow: "State update cycle; some large municipalities differ",
    packVersion: "1.0.0",
    notes: [
      "The Uniform Code is the statewide framework with local enforcement.",
      "Some large municipalities maintain separate construction codes \u2014 confirm with the local AHJ."
    ],
    sourceHint: "NYS Department of State / local code enforcement",
  },
  OH: {
    stateCode: "OH",
    typicalCycleYears: 3,
    modelBase: "Ohio Building Code / Residential Code",
    nextExpectedWindow: "Statewide code cycle with local administration",
    packVersion: "1.0.0",
    notes: [
      "Ohio maintains statewide building and residential codes with local administration.",
      "Confirm current editions and any local amendments."
    ],
    sourceHint: "Board of Building Standards / local AHJ",
  },
  OK: {
    stateCode: "OK",
    typicalCycleYears: 3,
    modelBase: "Oklahoma Building Codes (I-Codes based) / local amendments",
    nextExpectedWindow: "State and local paths; confirm locality",
    packVersion: "1.0.0",
    notes: [
      "Oklahoma uses statewide code frameworks with local administration and amendments.",
      "Confirm the current edition with the city or county AHJ."
    ],
    sourceHint: "State / local AHJ",
  },
  OR: {
    stateCode: "OR",
    typicalCycleYears: 3,
    modelBase: "Oregon Structural Specialty Code / Residential Specialty Code",
    nextExpectedWindow: "Statewide specialty codes with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Oregon maintains statewide specialty codes with local administration.",
      "Energy and seismic paths are frequently material.",
      "Confirm the current edition with the local department."
    ],
    sourceHint: "Building Codes Division / local AHJ",
  },
  PA: {
    stateCode: "PA",
    typicalCycleYears: 3,
    modelBase: "Pennsylvania Uniform Construction Code (UCC)",
    nextExpectedWindow: "UCC cycle; some municipalities opt out or amend",
    packVersion: "1.0.0",
    notes: [
      "UCC is the statewide framework; local enforcement and limited opt-outs exist.",
      "Confirm enforcement status and edition with the local code official."
    ],
    sourceHint: "Labor & Industry / local code official",
  },
  RI: {
    stateCode: "RI",
    typicalCycleYears: 3,
    modelBase: "Rhode Island State Building Code",
    nextExpectedWindow: "Statewide code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Rhode Island maintains a statewide building code with local administration.",
      "Confirm the current edition with the local department."
    ],
    sourceHint: "State Building Code Commission / local AHJ",
  },
  SC: {
    stateCode: "SC",
    typicalCycleYears: 3,
    modelBase: "South Carolina Building Codes (based on I-Codes)",
    nextExpectedWindow: "State-adopted codes with local administration",
    packVersion: "1.0.0",
    notes: [
      "South Carolina uses state-adopted codes with local administration.",
      "Coastal and flood provisions are frequently material on the coast."
    ],
    sourceHint: "Building Codes Council / local AHJ",
  },
  SD: {
    stateCode: "SD",
    typicalCycleYears: null,
    modelBase: "Local adoption of model codes",
    nextExpectedWindow: "Local only \u2014 varies by municipality",
    packVersion: "1.0.0",
    notes: [
      "South Dakota is primarily local adoption for building codes.",
      "Confirm the municipal adopted edition."
    ],
    sourceHint: "Local municipal AHJ",
  },
  TN: {
    stateCode: "TN",
    typicalCycleYears: 3,
    modelBase: "Tennessee Building Codes (I-Codes based) / local adoption paths",
    nextExpectedWindow: "State and local paths; confirm locality",
    packVersion: "1.0.0",
    notes: [
      "Tennessee has statewide code frameworks with substantial local administration.",
      "Confirm the current edition with the local building department."
    ],
    sourceHint: "State Fire Marshal / local AHJ",
  },
  TX: {
    stateCode: "TX",
    typicalCycleYears: null,
    modelBase: "Local adoption of IBC / IRC / NEC (no single statewide building code for all cities)",
    nextExpectedWindow: "Local only \u2014 varies by municipality",
    packVersion: "1.0.0",
    notes: [
      "Texas does not impose one statewide building code on all cities.",
      "Municipal and county adoptions and amendment calendars differ.",
      "Treat any state-level note as a pointer \u2014 confirm the local adopted edition."
    ],
    sourceHint: "Local municipal / county building department",
  },
  UT: {
    stateCode: "UT",
    typicalCycleYears: 3,
    modelBase: "Utah State Construction Code (I-Codes based)",
    nextExpectedWindow: "Statewide construction code with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Utah maintains a statewide construction code with local administration.",
      "Confirm the current edition with the local department."
    ],
    sourceHint: "Uniform Building Code Commission / local AHJ",
  },
  VA: {
    stateCode: "VA",
    typicalCycleYears: 3,
    modelBase: "Virginia Uniform Statewide Building Code (USBC)",
    nextExpectedWindow: "Statewide USBC cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Virginia uses a statewide USBC with local building departments.",
      "Confirm the current USBC edition with the locality."
    ],
    sourceHint: "DHCD / local building department",
  },
  VT: {
    stateCode: "VT",
    typicalCycleYears: 3,
    modelBase: "Vermont Fire & Building Safety Code / energy paths",
    nextExpectedWindow: "Statewide code paths with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Vermont maintains statewide fire and building safety code paths with local administration.",
      "Energy paths are frequently material.",
      "Confirm the current edition with the local AHJ."
    ],
    sourceHint: "Division of Fire Safety / local AHJ",
  },
  WA: {
    stateCode: "WA",
    typicalCycleYears: 3,
    modelBase: "Washington State Building Code (based on IBC/IRC)",
    nextExpectedWindow: "State code cycle with local amendments",
    packVersion: "1.0.0",
    notes: [
      "Statewide code with local administration \u2014 confirm city amendments.",
      "Washington energy code paths are frequently material to the project."
    ],
    sourceHint: "Washington State Building Code Council / local AHJ",
  },
  WI: {
    stateCode: "WI",
    typicalCycleYears: 3,
    modelBase: "Wisconsin Commercial Building Code / Uniform Dwelling Code",
    nextExpectedWindow: "Statewide code paths with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "Wisconsin maintains statewide commercial and dwelling code paths with local administration.",
      "Confirm the current edition with the local department."
    ],
    sourceHint: "DSPS / local AHJ",
  },
  WV: {
    stateCode: "WV",
    typicalCycleYears: 3,
    modelBase: "West Virginia State Building Code",
    nextExpectedWindow: "Statewide code cycle with local enforcement",
    packVersion: "1.0.0",
    notes: [
      "West Virginia maintains a statewide building code with local administration.",
      "Confirm the current edition with the local department."
    ],
    sourceHint: "State Fire Marshal / local AHJ",
  },
  WY: {
    stateCode: "WY",
    typicalCycleYears: null,
    modelBase: "Local adoption of model codes",
    nextExpectedWindow: "Local only \u2014 varies by municipality",
    packVersion: "1.0.0",
    notes: [
      "Wyoming is primarily local adoption for building codes.",
      "Confirm the city or county adopted edition."
    ],
    sourceHint: "Local municipal / county AHJ",
  },
};

/** Resolve cycle metadata for a state; returns a conservative default when unknown. */
export function resolveStateCodeCycle(stateCode?: string): StateCodeCycleMeta | null {
  const st = (stateCode || "").toUpperCase();
  if (!st) return null;
  if (STATE_CODE_CYCLES[st]) return STATE_CODE_CYCLES[st];
  return {
    stateCode: st,
    typicalCycleYears: null,
    modelBase: "IBC / IRC / NEC as adopted locally or by the state",
    nextExpectedWindow: "Confirm adopted edition and amendment calendar with the AHJ",
    packVersion: "1.0.0",
    notes: [
      "No detailed cycle profile is shipped for this state yet.",
      "Model codes typically update on a three-year publication cycle; state adoption lag varies.",
      "Always verify the current adopted edition with the local building official.",
    ],
  };
}

/**
 * Soft staleness signal for UI — guidance only.
 * Quieter policy: only surface a banner when we have a dedicated cycle profile
 * (or an explicit nextExpectedWindow worth calling out). Generic fallbacks stay silent.
 */
export function cycleStalenessMessage(
  meta: StateCodeCycleMeta | null,
  opts?: { dedicated?: boolean },
): string | null {
  if (!meta) return null;
  const dedicated = opts?.dedicated ?? false;
  // Dedicated home-rule / variable profiles still get a short honest note.
  if (meta.typicalCycleYears === null) {
    return dedicated
      ? "Local or variable adoption — confirm the current edition with the AHJ."
      : null;
  }
  if (dedicated && meta.nextExpectedWindow) {
    return `Guidance cycle note: ${meta.nextExpectedWindow}. Verify with the local building department.`;
  }
  return null;
}

/** True when a state has a curated cycle row (not the generic fallback). */
export function hasDedicatedCycleProfile(stateCode?: string): boolean {
  const st = (stateCode || "").toUpperCase();
  return Boolean(st && STATE_CODE_CYCLES[st]);
}
