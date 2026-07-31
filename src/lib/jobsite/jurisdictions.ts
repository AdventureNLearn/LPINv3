/**
 * United States jurisdiction starters — freeform templates, not live city APIs.
 * Other countries ship as separate product builds later.
 */

export interface UsState {
  code: string; // postal 2-letter, e.g. "FL"
  name: string; // full name, e.g. "Florida"
  /** Optional one-line guidance shown under the state selector */
  note?: string;
}

/** Full US states + DC. Sorted by name for the selector. */
export const US_STATES: UsState[] = [
  { code: "AL", name: "Alabama" },
  { code: "AK", name: "Alaska" },
  { code: "AZ", name: "Arizona" },
  { code: "AR", name: "Arkansas" },
  { code: "CA", name: "California", note: "Statewide CBC / Title 24 with local admin" },
  { code: "CO", name: "Colorado" },
  { code: "CT", name: "Connecticut" },
  { code: "DE", name: "Delaware" },
  { code: "DC", name: "District of Columbia", note: "Local code under DCRA" },
  { code: "FL", name: "Florida", note: "Statewide FBC — local admin; HVHZ product rules on coast" },
  { code: "GA", name: "Georgia" },
  { code: "HI", name: "Hawaii" },
  { code: "ID", name: "Idaho" },
  { code: "IL", name: "Illinois" },
  { code: "IN", name: "Indiana" },
  { code: "IA", name: "Iowa" },
  { code: "KS", name: "Kansas" },
  { code: "KY", name: "Kentucky" },
  { code: "LA", name: "Louisiana" },
  { code: "ME", name: "Maine" },
  { code: "MD", name: "Maryland" },
  { code: "MA", name: "Massachusetts" },
  { code: "MI", name: "Michigan" },
  { code: "MN", name: "Minnesota" },
  { code: "MS", name: "Mississippi" },
  { code: "MO", name: "Missouri" },
  { code: "MT", name: "Montana" },
  { code: "NE", name: "Nebraska" },
  { code: "NV", name: "Nevada" },
  { code: "NH", name: "New Hampshire" },
  { code: "NJ", name: "New Jersey" },
  { code: "NM", name: "New Mexico" },
  { code: "NY", name: "New York", note: "Uniform Code statewide framework" },
  { code: "NC", name: "North Carolina" },
  { code: "ND", name: "North Dakota" },
  { code: "OH", name: "Ohio" },
  { code: "OK", name: "Oklahoma" },
  { code: "OR", name: "Oregon" },
  { code: "PA", name: "Pennsylvania" },
  { code: "RI", name: "Rhode Island" },
  { code: "SC", name: "South Carolina" },
  { code: "SD", name: "South Dakota" },
  { code: "TN", name: "Tennessee" },
  { code: "TX", name: "Texas", note: "Local adoption — no single statewide building code" },
  { code: "UT", name: "Utah" },
  { code: "VT", name: "Vermont" },
  { code: "VA", name: "Virginia" },
  { code: "WA", name: "Washington", note: "Statewide Washington State Building Code" },
  { code: "WV", name: "West Virginia" },
  { code: "WI", name: "Wisconsin" },
  { code: "WY", name: "Wyoming" },
];

export interface UsJurisdictionTemplate {
  id: string;
  label: string;
  stateCode: string;
  cityState: string;
  locationHint: string;
  permittingOffice: string;
  permitNumberHint: string;
  commonInspections: string[];
}

export const US_JURISDICTION_TEMPLATES: UsJurisdictionTemplate[] = [
  {
    id: "us-custom",
    label: "Custom / type your AHJ",
    stateCode: "",
    cityState: "",
    locationHint: "United States",
    permittingOffice: "City / County Building Department",
    permitNumberHint: "TBD",
    commonInspections: [
      "Foundation / footing",
      "Framing",
      "Rough-in (plumbing, electrical, and HVAC)",
      "Insulation / energy",
      "Final building",
    ],
  },
];

export const US_PRODUCT_NOTICE = {
  region: "United States only (this build)",
  notCityPortal:
    "This is your team’s board — not a login to any city or county system. Copy, email, or print packets for real offices.",
  openSource:
    "Open format project packs (.lpin-jobsite.json). Your data stays on this device until you export it.",
  later:
    "Other countries will ship as separate versions later.",
} as const;
