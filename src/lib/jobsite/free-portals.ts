/**
 * Free public building-department / code resource links.
 * Information only — not logins, not official forms, not endorsements.
 *
 * OPSEC / geographic agnosticism: no municipality-named portals.
 * State selection does not surface city-specific links.
 */

export interface FreeResourceLink {
  id: string;
  label: string;
  url: string;
  note: string;
}

/** National free references anyone can open without a paid subscription. */
export const NATIONAL_FREE_RESOURCES: FreeResourceLink[] = [
  {
    id: "osha",
    label: "OSHA construction standards (public)",
    url: "https://www.osha.gov/laws-regs/regulations/standardnumber/1926",
    note: "Federal construction safety standards — free to read.",
  },
  {
    id: "ada",
    label: "ADA Standards (public)",
    url: "https://www.access-board.gov/ada/",
    note: "Accessibility standards published by the U.S. Access Board.",
  },
  {
    id: "icc-codes",
    label: "ICC public access portal",
    url: "https://codes.iccsafe.org/",
    note: "Read-only model codes as published by ICC (free public access view).",
  },
  {
    id: "nfpa-list",
    label: "NFPA free access list",
    url: "https://www.nfpa.org/for-professionals/codes-and-standards/list-of-codes-and-standards",
    note: "Index of NFPA documents; free access terms set by NFPA.",
  },
  {
    id: "epa-swppp",
    label: "EPA construction stormwater (CGP)",
    url: "https://www.epa.gov/npdes/stormwater-discharges-construction-activities",
    note: "Federal construction stormwater overview — check your state CGP.",
  },
  {
    id: "fl-building-commission",
    label: "Florida Building Commission (public site)",
    url: "https://www.floridabuilding.org/",
    note: "State public site for the FBC process — not a local AHJ login.",
  },
];

/**
 * Per-state optional links. Kept empty for geographic agnosticism —
 * no city/county portals ship in-app. Callers still get national resources.
 */
export const JURISDICTION_PUBLIC_LINKS: Record<string, FreeResourceLink[]> = {};

/** Resolve free links for a state — national only unless a state row is curated later. */
export function freeLinksForState(stateCode?: string): FreeResourceLink[] {
  const st = (stateCode || "").toUpperCase();
  const local = st ? JURISDICTION_PUBLIC_LINKS[st] ?? [] : [];
  // Florida-only national-adjacent: include FBC commission when FL selected
  const extra =
    st === "FL"
      ? NATIONAL_FREE_RESOURCES.filter((r) => r.id === "fl-building-commission")
      : [];
  const national = NATIONAL_FREE_RESOURCES.filter(
    (r) => r.id !== "fl-building-commission" || st === "FL",
  );
  // Avoid dupes
  const seen = new Set<string>();
  const out: FreeResourceLink[] = [];
  for (const link of [...local, ...extra, ...national]) {
    if (seen.has(link.id)) continue;
    // Only show FL commission when FL selected
    if (link.id === "fl-building-commission" && st !== "FL") continue;
    seen.add(link.id);
    out.push(link);
  }
  return out;
}

/** @deprecated alias */
export const resolveFreePortalLinks = freeLinksForState;
