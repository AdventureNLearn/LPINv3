import type { ContactRole, ScheduleTaskStatus, TradeDivision } from "./types";

export const TRADE_DIVISIONS: { id: TradeDivision; label: string; short: string }[] =
  [
    { id: "general", label: "General / GC", short: "GC" },
    { id: "sitework", label: "Sitework / civil", short: "Site" },
    { id: "concrete", label: "Concrete", short: "Conc" },
    { id: "steel", label: "Structural steel", short: "Steel" },
    { id: "carpentry", label: "Carpentry / framing", short: "Frame" },
    { id: "roofing", label: "Roofing", short: "Roof" },
    { id: "waterproofing", label: "Waterproofing", short: "WP" },
    { id: "mechanical", label: "Mechanical / HVAC", short: "Mech" },
    { id: "electrical", label: "Electrical", short: "Elec" },
    { id: "plumbing", label: "Plumbing", short: "Plumb" },
    { id: "fire_protection", label: "Fire protection", short: "Fire" },
    { id: "drywall", label: "Drywall / interiors", short: "DW" },
    { id: "glazing", label: "Glazing / curtain wall", short: "Glass" },
    { id: "flooring", label: "Flooring", short: "Floor" },
    { id: "paint", label: "Paint / finishes", short: "Paint" },
    { id: "materials", label: "Materials / supply", short: "Matl" },
    { id: "other", label: "Other", short: "Other" },
  ];

export function divisionLabel(d: TradeDivision): string {
  return TRADE_DIVISIONS.find((x) => x.id === d)?.label ?? d;
}

export function divisionShort(d: TradeDivision): string {
  return TRADE_DIVISIONS.find((x) => x.id === d)?.short ?? d;
}

export function contactRoleLabel(r: ContactRole): string {
  switch (r) {
    case "vendor":
      return "Vendor";
    case "subcontractor":
      return "Subcontractor";
    case "supplier":
      return "Supplier";
    case "inspector":
      return "Inspector / third party";
    case "owner_rep":
      return "Owner’s rep";
    case "internal":
      return "Internal / crew";
  }
}

export function scheduleStatusLabel(s: ScheduleTaskStatus): string {
  switch (s) {
    case "planned":
      return "Planned";
    case "in_progress":
      return "In progress";
    case "blocked":
      return "Blocked";
    case "done":
      return "Done";
    case "cancelled":
      return "Cancelled";
  }
}

export function scheduleStatusColor(s: ScheduleTaskStatus | string): string {
  switch (s) {
    case "planned":
    case "requested":
      return "#6b9ec4";
    case "in_progress":
    case "scheduled":
    case "ready_for_inspector":
      return "#f0c45c";
    case "blocked":
    case "failed":
      return "#d45b5b";
    case "done":
    case "passed":
      return "#3dba8a";
    case "cancelled":
      return "#7d92a6";
    default:
      return "#f08a5a";
  }
}
