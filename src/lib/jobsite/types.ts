export type Priority = "P0" | "P1" | "P2" | "P3";
export type Urgency = "immediate" | "today" | "this_week" | "whenever";
export type Role = "field" | "office" | "owner" | "authority";
export type ReportStatus = "open" | "seen" | "resolved";
export type ReportCategory =
  | "safety"
  | "permit"
  | "inspection"
  | "materials"
  | "weather"
  | "other";

export interface FieldReport {
  id: string;
  title: string;
  body: string;
  priority: Priority;
  urgency: Urgency;
  category: ReportCategory;
  authorRole: Role;
  authorName: string;
  status: ReportStatus;
  createdAt: string;
  seenAt?: string;
  seenBy?: string;
  sendToAuthority: boolean;
  relatedInspectionId?: string;
  relatedMessageId?: string;
  area?: string;
  /** Linked photo note ids (device-local). */
  photoIds?: string[];
}

export type MessageDirection =
  | "field_to_authority"
  | "authority_to_field"
  | "office_to_authority"
  | "internal";

export type MessageStatus = "sent" | "read" | "replied";

export interface AuthorityMessage {
  id: string;
  direction: MessageDirection;
  subject: string;
  body: string;
  authorName: string;
  authorRole: Role;
  status: MessageStatus;
  createdAt: string;
  relatedReportId?: string;
  relatedInspectionId?: string;
  wiredFrom?: "report" | "inspection" | "manual";
}

export type InspectionStatus =
  | "requested"
  | "scheduled"
  | "ready_for_inspector"
  | "passed"
  | "failed"
  | "cancelled";

export interface Inspection {
  id: string;
  typeLabel: string;
  scheduledDate: string;
  timeWindow: string;
  buildingArea: string;
  status: InspectionStatus;
  requestedBy: string;
  notes: string;
  authorityOffice: string;
  createdAt: string;
  relatedReportId?: string;
}

export interface MaterialLine {
  id: string;
  name: string;
  qty: number;
  unit: string;
  status: "on_site" | "ordered" | "short" | "blocked";
  note?: string;
  division?: string;
}

export interface ScheduleItem {
  id: string;
  name: string;
  start: string;
  end: string;
  status: "on_track" | "at_risk" | "blocked" | "done";
  owner: string;
  pct?: number;
}

export interface ProjectContact {
  id: string;
  name: string;
  role: string;
  org: string;
  phone?: string;
  email?: string;
  lane: "field" | "office" | "owner" | "authority" | "trade";
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

export interface FieldComm {
  id: string;
  projectId: string;
  kind: CommKind | string;
  phase: CommPhase | string;
  division: string;
  scopes?: string[];
  fromRole: string;
  toRoles: string[];
  fromName: string;
  toNames: string[];
  text: string;
  contractId?: string;
  vendorId?: string;
  ackRequired?: boolean;
  acked?: boolean;
  createdAt: string;
}

export interface FieldCommsLog {
  version: 1;
  projectId: string;
  messages: FieldComm[];
  generatedAt: string;
}

export interface SiteGeo {
  version: 1;
  pin?: { lat: number; lon: number; label?: string };
  boundaryRing?: [number, number][];
  note?: string;
}

/**
 * Field photo stored on-device as a compressed data URL.
 * Used as standalone notes or linked to reports for metadata.
 */
export interface PhotoNote {
  id: string;
  /** JPEG data URL (compressed for device storage). */
  dataUrl: string;
  caption: string;
  area?: string;
  authorRole: Role;
  authorName: string;
  createdAt: string;
  source: "camera" | "library";
  relatedReportId?: string;
  width?: number;
  height?: number;
  bytesApprox?: number;
}

/** Full site identity — same fields as desktop ProjectIdentity. */
export interface ProjectIdentity {
  name: string;
  location: string;
  cityState?: string;
  permitNumber: string;
  permittingOffice: string;
  stateCode?: string;
  captainName?: string;
  notes?: string;
  industry?: string;
  projectStartDate?: string;
  materialsBudget?: number;
}

export interface JobsiteProject {
  id: string;
  name: string;
  location: string;
  cityState?: string;
  permitNumber: string;
  permittingOffice: string;
  captainName: string;
  isDemo: boolean;
  industry: string;
  notes: string;
  stateCode?: string;
  projectStartDate?: string;
  materialsBudget?: number;
  country: "US";
  reports: FieldReport[];
  messages: AuthorityMessage[];
  fieldComms: FieldCommsLog;
  inspections: Inspection[];
  materials: MaterialLine[];
  schedule: ScheduleItem[];
  contacts: ProjectContact[];
  photos: PhotoNote[];
  site: SiteGeo;
  updatedAt: string;
}

export interface ProjectMeta {
  id: string;
  name: string;
  stateCode?: string;
  isDemo: boolean;
  industry: string;
  updatedAt: string;
}

export type MobileTab = "board" | "log" | "plan" | "map" | "setup";
export type RoleLens = Role;
export type LogLane = "all" | "authority" | "field" | "acks";

export const ROLE_OPTIONS: { id: RoleLens; label: string; short: string }[] = [
  { id: "field", label: "Jobsite crew", short: "Field" },
  { id: "office", label: "Office desk", short: "Office" },
  { id: "owner", label: "Owner’s rep", short: "Owner" },
  { id: "authority", label: "Authority / AHJ", short: "AHJ" },
];

export function roleAuthorName(role: RoleLens): string {
  switch (role) {
    case "field":
      return "Field (this device)";
    case "office":
      return "Office desk";
    case "owner":
      return "Owner’s rep";
    case "authority":
      return "Authority mirror";
  }
}
