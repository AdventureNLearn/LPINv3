/**
 * Free inspection readiness checklists — plain English field prep.
 * Guidance only; not AHJ forms.
 */

export interface ChecklistItem {
  id: string;
  text: string;
}

export interface ChecklistTemplate {
  id: string;
  label: string;
  /** Match against inspection typeLabel (case-insensitive includes) */
  match: string[];
  items: ChecklistItem[];
}

export const INSPECTION_CHECKLISTS: ChecklistTemplate[] = [
  {
    id: "foundation",
    label: "Foundation / slab readiness",
    match: ["foundation", "footing", "slab", "pier"],
    items: [
      { id: "f1", text: "Approved drawings on site (stamped set)" },
      { id: "f2", text: "Forms set to lines and grades" },
      { id: "f3", text: "Rebar placed, tied, clearances checked" },
      { id: "f4", text: "Vapor barrier / waterproofing as required" },
      { id: "f5", text: "Embeds and sleeves in place" },
      { id: "f6", text: "Area safe, ladders/access ready for inspector" },
    ],
  },
  {
    id: "framing",
    label: "Framing / shear readiness",
    match: ["framing", "shear", "structural"],
    items: [
      { id: "r1", text: "Walls plumb; hold-downs and straps installed" },
      { id: "r2", text: "Shear panels nailed per schedule" },
      { id: "r3", text: "Openings framed; headers sized" },
      { id: "r4", text: "Truss / joist layout matches drawings" },
      { id: "r5", text: "Temporary bracing still in place where needed" },
      { id: "r6", text: "No concealed work covering inspection points" },
    ],
  },
  {
    id: "rough",
    label: "MEP rough-in readiness",
    match: ["rough", "mep", "plumbing", "electrical", "mechanical", "hvac"],
    items: [
      { id: "m1", text: "All rough lines complete and supported" },
      { id: "m2", text: "Test pressure / continuity done if required" },
      { id: "m3", text: "Firestopping and sleeves at penetrations" },
      { id: "m4", text: "Boxes and devices accessible; covers off" },
      { id: "m5", text: "Combustion air / clearances verified" },
      { id: "m6", text: "Area lit and accessible for walk-through" },
    ],
  },
  {
    id: "insulation",
    label: "Insulation / energy readiness",
    match: ["insulation", "energy", "envelope"],
    items: [
      { id: "i1", text: "Cavities filled to specified R-value" },
      { id: "i2", text: "Air barrier continuous where required" },
      { id: "i3", text: "Windows/doors sealed per detail" },
      { id: "i4", text: "Attic access and baffles correct" },
      { id: "i5", text: "No covering until inspector signs off" },
    ],
  },
  {
    id: "fire",
    label: "Fire / life safety readiness",
    match: ["fire", "sprinkler", "alarm", "life safety"],
    items: [
      { id: "fs1", text: "Approved shop drawings on site" },
      { id: "fs2", text: "Devices installed per layout" },
      { id: "fs3", text: "Valves accessible; signage up" },
      { id: "fs4", text: "Impairments logged; system ready to test" },
      { id: "fs5", text: "Egress paths clear" },
    ],
  },
  {
    id: "swq",
    label: "Stormwater / site readiness",
    match: ["storm", "swq", "erosion", "drainage", "swppp"],
    items: [
      { id: "s1", text: "BMPs installed per SWPPP map" },
      { id: "s2", text: "Inlets protected; no tracking off site" },
      { id: "s3", text: "Silt cleaned from protected drains" },
      { id: "s4", text: "Spill kit available" },
      { id: "s5", text: "Rain forecast reviewed for hold points" },
    ],
  },
  {
    id: "final",
    label: "Final / CO readiness",
    match: ["final", "occupancy", "co", "tco"],
    items: [
      { id: "c1", text: "Prior inspections passed or closed" },
      { id: "c2", text: "Life safety devices operational" },
      { id: "c3", text: "Address and unit numbers posted" },
      { id: "c4", text: "Handrails, guards, accessibility path complete" },
      { id: "c5", text: "As-builts / O&M package staged for owner" },
      { id: "c6", text: "Site clean enough for final walk" },
    ],
  },
  {
    id: "generic",
    label: "General inspection readiness",
    match: [],
    items: [
      { id: "g1", text: "Permit card / number available on site" },
      { id: "g2", text: "Approved plans on site" },
      { id: "g3", text: "Work open and visible for the scope requested" },
      { id: "g4", text: "Safe access for the inspector" },
      { id: "g5", text: "Responsible person present or reachable" },
    ],
  },
];

export function resolveChecklist(typeLabel: string): ChecklistTemplate {
  const lower = typeLabel.toLowerCase();
  for (const t of INSPECTION_CHECKLISTS) {
    if (!t.match.length) continue;
    if (t.match.some((m) => lower.includes(m))) return t;
  }
  return INSPECTION_CHECKLISTS.find((t) => t.id === "generic")!;
}
