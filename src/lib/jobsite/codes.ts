/**
 * US AHJ / model code reference packs by location.
 * Guidance only — not a live code library or legal advice.
 * Field teams still verify with the local building department.
 */

export interface CodeRequirement {
  id: string;
  title: string;
  summary: string;
  /** Typical hold points / inspections */
  holdPoints: string[];
}

export interface AhjCodePack {
  id: string;
  label: string;
  stateCode: string;
  ahjName: string;
  modelCodes: string[];
  notes: string[];
  requirements: CodeRequirement[];
  /** Common permit types this AHJ issues */
  commonPermits: string[];
}

const BASE_IBC: CodeRequirement[] = [
  {
    id: "struct",
    title: "Structural / foundation",
    summary: "Footings, slabs, and framing must match approved drawings before cover.",
    holdPoints: ["Footing", "Foundation / slab", "Framing / shear"],
  },
  {
    id: "mep",
    title: "MEP rough-in",
    summary: "Mechanical, electrical, and plumbing rough inspected before concealment.",
    holdPoints: ["Rough plumbing", "Rough electrical", "Rough mechanical / HVAC"],
  },
  {
    id: "fire",
    title: "Fire / life safety",
    summary: "Egress, alarms, and suppression systems per approved life-safety drawings.",
    holdPoints: ["Fire sprinkler rough", "Fire alarm", "Life safety final"],
  },
  {
    id: "energy",
    title: "Energy / envelope",
    summary: "Insulation, air barrier, and fenestration per energy code path on the permit.",
    holdPoints: ["Insulation", "Envelope / window"],
  },
  {
    id: "final",
    title: "Final / occupancy",
    summary: "Final building inspection and certificate of occupancy (or TCO) path.",
    holdPoints: ["Final building", "CO / TCO"],
  },
];

function pack(
  partial: Omit<AhjCodePack, "requirements"> & { extraReqs?: CodeRequirement[] },
): AhjCodePack {
  return {
    id: partial.id,
    label: partial.label,
    stateCode: partial.stateCode,
    ahjName: partial.ahjName,
    modelCodes: partial.modelCodes,
    notes: partial.notes,
    commonPermits: partial.commonPermits,
    requirements: [...BASE_IBC, ...(partial.extraReqs ?? [])],
  };
}

/** Synthesize a usable baseline pack for any state that lacks a dedicated entry. */
function synthesizeStatePack(stateCode: string): AhjCodePack {
  const st = stateCode.toUpperCase();
  return pack({
    id: `us-${st.toLowerCase()}-synth`,
    label: `${st} (baseline guidance)`,
    stateCode: st,
    ahjName: "Local city / county building department",
    modelCodes: [
      "IBC / IRC as adopted by the state or locality",
      "NEC (electrical)",
      "IPC / IMC / IFC as adopted",
    ],
    notes: [
      `No dedicated detailed pack is shipped for ${st} yet — this is a conservative baseline.`,
      "Confirm the adopted edition year and any state or local amendments with the AHJ.",
      "Local amendments always override model code text.",
      "This board is a team copy — not a portal login.",
    ],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  });
}

export const AHJ_CODE_PACKS: AhjCodePack[] = [
  pack({
    id: "us-generic",
    label: "Generic US (verify locally)",
    stateCode: "",
    ahjName: "City / County Building Department",
    modelCodes: [
      "IBC (commercial / multi-family)",
      "IRC (one- and two-family)",
      "NEC (electrical)",
      "IPC / IMC / IFC as adopted",
    ],
    notes: [
      "Confirm the edition year adopted by your city or county.",
      "Local amendments always override model code text.",
      "This board is a team copy — not a portal login.",
    ],
    commonPermits: [
      "Building",
      "Electrical",
      "Plumbing",
      "Mechanical",
      "Fire",
    ],
  }),
  pack({
    id: "us-tx",
    label: "Texas (state baseline)",
    stateCode: "TX",
    ahjName: "Local municipal or county AHJ",
    modelCodes: [
      "IBC / IRC as adopted locally",
      "NEC",
      "IPC / IMC",
      "IFC / NFPA as adopted",
      "Texas Accessibility Standards (where applicable)",
    ],
    notes: [
      "Texas does not use a single statewide building code for all cities — check the municipal adoption.",
      "Wind, flood, and energy paths vary by region (coastal vs inland).",
    ],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire", "Sign"],
    extraReqs: [
      {
        id: "swq-tx",
        title: "Stormwater / site drainage",
        summary: "Many Texas cities require SWQ / erosion controls before and during work.",
        holdPoints: ["SWPPP / erosion", "Storm inlet protection", "Final drainage"],
      },
    ],
  }),
  pack({
    id: "us-fl",
    label: "Florida (FBC statewide baseline)",
    stateCode: "FL",
    ahjName: "Local building department (Florida Building Code)",
    modelCodes: [
      "Florida Building Code (FBC) 8th Edition (2023) — Building",
      "FBC Residential",
      "FBC Existing Building",
      "FBC Energy Conservation",
      "FBC Accessibility (aligned with FAS / federal standards as adopted)",
      "NEC as adopted in the FBC",
      "Florida Fire Prevention Code (FFPC)",
    ],
    notes: [
      "Florida uses a single statewide Florida Building Code; cities and counties administer permits and inspections locally.",
      "Edition cycles run on an approximately three-year Florida Building Commission process — confirm the edition printed on your permit.",
      "High-Velocity Hurricane Zones (HVHZ), where designated, add product-approval / NOA rules for envelope components.",
      "Roof systems, openings, and wind-borne debris protection are among the most common hold points on coastal and HVHZ work.",
      "Flood design (where mapped) often runs in parallel with structural and envelope reviews — verify FIRM zone with the AHJ.",
      "This board is team guidance and a handoff pack — not a login to a city portal and not legal advice.",
    ],
    commonPermits: [
      "Building",
      "Roofing",
      "Electrical",
      "Plumbing",
      "Mechanical",
      "Fire",
      "Window / shutter",
      "Flood / elevation certificate path (where required)",
    ],
    extraReqs: [
      {
        id: "fl-wind",
        title: "Wind design / envelope protection",
        summary:
          "Design pressures, roof attachment, and opening protection must match the permit path. In HVHZ, product approvals (NOA / FL product approval) are commonly required before cover.",
        holdPoints: [
          "Roof dry-in / underlayment",
          "Roof final / fastening",
          "Window / door install",
          "Shutters or impact glazing (as required)",
          "Final envelope",
        ],
      },
      {
        id: "fl-flood",
        title: "Flood / elevation (when in SFHA)",
        summary:
          "Where the site is in a Special Flood Hazard Area, elevation certificates and flood-resistant materials / openings follow the AHJ and FBC flood provisions.",
        holdPoints: [
          "Elevation certificate (as required)",
          "Flood openings / materials",
          "Final flood documentation",
        ],
      },
      {
        id: "fl-threshold",
        title: "Threshold building path (when applicable)",
        summary:
          "Larger / threshold buildings may require special inspections and threshold inspector involvement under Florida law — confirm with the AHJ early.",
        holdPoints: [
          "Threshold inspection plan",
          "Special inspection reports",
          "Structural sign-off path",
        ],
      },
    ],
  }),
  pack({
    id: "us-ca",
    label: "California (state baseline)",
    stateCode: "CA",
    ahjName: "Local building department (Title 24 / CBC)",
    modelCodes: [
      "California Building Code (CBC) — based on IBC",
      "California Residential Code",
      "California Electrical Code (based on NEC)",
      "California Energy Code (Title 24, Part 6)",
      "California Fire Code",
    ],
    notes: [
      "Statewide Title 24 with local administration and amendments.",
      "Energy (Part 6) and accessibility (Ch 11A/11B) paths are frequently material.",
      "Confirm current edition and any local amendments with the AHJ.",
    ],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire", "Energy"],
  }),
  pack({
    id: "us-va",
    label: "Virginia (state baseline)",
    stateCode: "VA",
    ahjName: "Local building department (USBC)",
    modelCodes: [
      "Virginia Uniform Statewide Building Code (USBC)",
      "NEC as adopted",
      "Virginia Statewide Fire Prevention Code",
    ],
    notes: [
      "Statewide USBC with local enforcement.",
      "Confirm the current USBC edition with the locality.",
    ],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  }),
  pack({
    id: "us-ga",
    label: "Georgia (state baseline)",
    stateCode: "GA",
    ahjName: "Local building department",
    modelCodes: [
      "Georgia State Minimum Standard Codes (based on I-Codes)",
      "NEC as adopted",
      "Georgia Fire codes as applicable",
    ],
    notes: [
      "State minimum standard codes with local administration and amendments.",
      "Confirm adopted edition and local amendments with the AHJ.",
    ],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  }),
  pack({
    id: "us-pa",
    label: "Pennsylvania (state baseline)",
    stateCode: "PA",
    ahjName: "Local code official (UCC)",
    modelCodes: [
      "Pennsylvania Uniform Construction Code (UCC)",
      "NEC as adopted under UCC",
      "Local fire rules as applicable",
    ],
    notes: [
      "UCC is the statewide framework; some municipalities have limited opt-outs or amendments.",
      "Confirm enforcement status and edition with the local code official.",
    ],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  }),
  pack({
    id: "us-oh",
    label: "Ohio (state baseline)",
    stateCode: "OH",
    ahjName: "Local building department",
    modelCodes: [
      "Ohio Building Code",
      "Ohio Residential Code",
      "NEC as adopted",
    ],
    notes: [
      "Statewide building and residential codes with local administration.",
      "Confirm current editions and any local amendments.",
    ],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  }),
  pack({
    id: "us-nc",
    label: "North Carolina (state baseline)",
    stateCode: "NC",
    ahjName: "Local building department",
    modelCodes: [
      "North Carolina Building Code (based on I-Codes)",
      "North Carolina Residential Code",
      "NEC as adopted",
    ],
    notes: [
      "Statewide codes with local enforcement; residential review cycles have lengthened in recent years.",
      "Confirm the current edition with the local department.",
    ],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  }),
  pack({
    id: "us-sc",
    label: "South Carolina (state baseline)",
    stateCode: "SC",
    ahjName: "Local building department",
    modelCodes: [
      "South Carolina Building Codes (based on I-Codes)",
      "NEC as adopted",
    ],
    notes: [
      "State-adopted codes with local administration.",
      "Coastal and flood provisions are frequently material on the coast.",
    ],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  }),
  pack({
    id: "us-ma",
    label: "Massachusetts (state baseline)",
    stateCode: "MA",
    ahjName: "Local building department",
    modelCodes: [
      "Massachusetts State Building Code (based on I-Codes)",
      "Massachusetts Electrical Code (based on NEC)",
      "Stretch energy code where adopted",
    ],
    notes: [
      "Statewide code with local enforcement; some municipalities adopt stretch energy provisions.",
      "Confirm current edition and any stretch path with the AHJ.",
    ],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  }),
  pack({
    id: "us-nj",
    label: "New Jersey (state baseline)",
    stateCode: "NJ",
    ahjName: "Local construction official",
    modelCodes: [
      "New Jersey Uniform Construction Code",
      "NEC as adopted",
    ],
    notes: [
      "Statewide UCC with local construction officials.",
      "Confirm current adopted editions with the municipality.",
    ],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  }),
  pack({
    id: "us-md",
    label: "Maryland (state baseline)",
    stateCode: "MD",
    ahjName: "Local building department",
    modelCodes: [
      "Maryland Building Performance Standards (based on I-Codes)",
      "NEC as adopted",
    ],
    notes: [
      "Statewide standards with local administration and amendments.",
      "Confirm adopted edition and local amendments with the AHJ.",
    ],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  }),
  pack({
    id: "us-co",
    label: "Colorado (state baseline)",
    stateCode: "CO",
    ahjName: "Local municipal AHJ",
    modelCodes: ["IBC / IRC as adopted", "NEC", "IMC / IPC", "IECC energy"],
    notes: [
      "Snow load and energy code paths vary by elevation and jurisdiction.",
      "Local amendments vary by municipality — confirm with the local AHJ.",
    ],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  }),
  pack({
    id: "us-az",
    label: "Arizona (state baseline)",
    stateCode: "AZ",
    ahjName: "Local municipal AHJ",
    modelCodes: ["IBC / IRC as adopted", "NEC", "IMC / IPC"],
    notes: ["Heat, dust, and monsoon season affect site and envelope sequencing."],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  }),
  pack({
    id: "us-wa",
    label: "Washington (state baseline)",
    stateCode: "WA",
    ahjName: "Local AHJ under Washington State Building Code",
    modelCodes: [
      "Washington State Building Code (based on IBC/IRC)",
      "NEC",
      "Washington energy code",
    ],
    notes: ["State code with local administration — confirm city amendments."],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  }),
  pack({
    id: "us-ny",
    label: "New York (state baseline)",
    stateCode: "NY",
    ahjName: "Local code enforcement",
    modelCodes: ["Uniform Code (NYS)", "Energy Code", "NEC as adopted"],
    notes: ["Some large municipalities maintain separate construction codes — confirm the path with the local AHJ."],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  }),
  pack({
    id: "us-il",
    label: "Illinois (state baseline)",
    stateCode: "IL",
    ahjName: "Local municipal AHJ",
    modelCodes: ["IBC / IRC as adopted", "NEC", "Illinois Plumbing Code (where applicable)"],
    notes: ["Some large municipalities maintain distinct code paths — confirm with the local AHJ."],
    commonPermits: ["Building", "Electrical", "Plumbing", "Mechanical", "Fire"],
  }),
];

/**
 * Resolve AHJ / code pack for the jobsite.
 * When a state is selected, the pack follows the state only — city, permit number,
 * and office freeform fields do not override it. Every US state + DC synthesizes
 * a baseline when no dedicated pack exists.
 */
export function resolveAhjCodePack(input: {
  stateCode?: string;
  cityState?: string;
  permittingOffice?: string;
  jurisdictionTemplateId?: string;
}): AhjCodePack {
  const st = (input.stateCode || "").toUpperCase().trim();

  // State is the sole jurisdiction key for the AHJ panel.
  if (st) {
    const statePack = AHJ_CODE_PACKS.find(
      (p) => p.stateCode === st && p.id === `us-${st.toLowerCase()}`,
    );
    if (statePack) return statePack;

    // Synthesize so all 51 (50 states + DC) always get guidance.
    return synthesizeStatePack(st);
  }

  // No city-name routing — geographic agnosticism / OPSEC.
  // Without a state, return the generic US baseline only.
  return AHJ_CODE_PACKS.find((p) => p.id === "us-generic")!;
}

export const CODE_DISCLAIMER =
  "Code packs are field guidance only — not legal advice and not a substitute for the adopted code text or the local building official.";
