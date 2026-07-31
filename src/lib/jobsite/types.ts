/**
 * Priority levels (how urgent a field problem is).
 * Written short as P0–P3; full meaning always shown in the UI.
 */
export type Priority = "P0" | "P1" | "P2" | "P3";

export type Urgency = "immediate" | "today" | "this_week" | "whenever";

/**
 * Who is using the app right now:
 * - field = people on the jobsite
 * - office = project desk / operations
 * - owner = property owner or developer
 * - authority = city/county permitting office or inspection desk (team mirror role)
 */
export type Role = "field" | "office" | "owner" | "authority";

export type ReportStatus = "open" | "seen" | "resolved";

export type ReportCategory =
  | "safety"
  | "permit"
  | "inspection"
  | "materials"
  | "weather"
  | "other";

/** Photo captured on device (compressed data URL — stays local / in export pack). */
export interface ReportPhoto {
  id: string;
  dataUrl: string;
  caption?: string;
  createdAt: string;
}

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
  photos?: ReportPhoto[];
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
  typeCode?: string;
  scheduledDate: string;
  timeWindow: string;
  buildingArea: string;
  status: InspectionStatus;
  requestedBy: string;
  notes: string;
  authorityOffice: string;
  createdAt: string;
  updatedAt: string;
  relatedReportId?: string;
  relatedMessageId?: string;
  endDate?: string;
  contactId?: string;
  /** Free readiness checklist progress (device-local) */
  checklist?: InspectionChecklistState;
}

export type TradeDivision =
  | "general"
  | "concrete"
  | "steel"
  | "carpentry"
  | "roofing"
  | "waterproofing"
  | "mechanical"
  | "electrical"
  | "plumbing"
  | "fire_protection"
  | "drywall"
  | "glazing"
  | "flooring"
  | "paint"
  | "sitework"
  | "materials"
  | "other";

export type ContactRole =
  | "vendor"
  | "subcontractor"
  | "supplier"
  | "inspector"
  | "owner_rep"
  | "internal";

export interface ProjectContact {
  id: string;
  company: string;
  contactName: string;
  division: TradeDivision;
  role: ContactRole;
  phone?: string;
  email?: string;
  scope: string;
  inventoryNotes?: string;
  conditionNotes?: string;
  leadTime?: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ScheduleTaskStatus =
  | "planned"
  | "in_progress"
  | "blocked"
  | "done"
  | "cancelled";

export interface ScheduleTask {
  id: string;
  title: string;
  division: TradeDivision;
  startDate: string;
  endDate: string;
  status: ScheduleTaskStatus;
  progress: number;
  contactId?: string;
  relatedInspectionId?: string;
  relatedReportId?: string;
  notes?: string;
  milestone?: boolean;
  /** Predecessor task ids (finish-to-start, simplified) */
  dependsOnIds?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface InspectionChecklistState {
  templateId: string;
  checked: Record<string, boolean>;
}

export interface DailyLogEntry {
  id: string;
  date: string;
  weatherNote?: string;
  crewCount?: number;
  workDone: string;
  delays?: string;
  safetyNote?: string;
  authorName: string;
  createdAt: string;
}

export interface PunchItem {
  id: string;
  title: string;
  location: string;
  trade?: string;
  status: "open" | "ready" | "closed";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChangeOrder {
  id: string;
  number: string;
  title: string;
  amount?: number;
  status: "draft" | "submitted" | "approved" | "rejected";
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

/** Construction industry classification for schedule templates */
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

export type MaterialStatus =
  | "needed"
  | "quoted"
  | "ordered"
  | "partial"
  | "on_site"
  | "installed";

/**
 * Material / procurement line — field can source from schedule
 * within contract quantities and unit pricing.
 */
export interface MaterialLine {
  id: string;
  name: string;
  division: TradeDivision;
  unit: string;
  qtyRequired: number;
  qtyOnHand: number;
  /** Budget / contract unit cost (USD) */
  unitCost: number;
  /** Optional actual quoted unit cost */
  quotedUnitCost?: number;
  status: MaterialStatus;
  vendorContactId?: string;
  scheduleTaskId?: string;
  /** Contract / specification reference */
  specNote?: string;
  /** Free-text supplier lead or PO # */
  poNote?: string;
  createdAt: string;
  updatedAt: string;
}

/** User-owned site geometry — never drives AHJ pack resolution. */
export type SiteLayerKind =
  | "site_boundary"
  | "flood"
  | "utility"
  | "access"
  | "other";

export type SiteLayerSource = "user_draw" | "user_import" | "user_pin";

/** Minimal GeoJSON FeatureCollection (device-local). */
export interface SiteGeoJsonFeature {
  type: "Feature";
  properties?: Record<string, unknown> | null;
  geometry: {
    type: string;
    coordinates: unknown;
  };
}

export interface SiteGeoJsonCollection {
  type: "FeatureCollection";
  features: SiteGeoJsonFeature[];
}

export interface SiteLayer {
  id: string;
  kind: SiteLayerKind;
  /** User label only — never a catalog city key */
  label: string;
  source: SiteLayerSource;
  geojson: SiteGeoJsonCollection;
}

/**
 * Device-local map pin + layers.
 * State still owns AHJ packs; this never overrides resolveAhjCodePack.
 */
export interface SiteGeo {
  version: 1;
  pin?: { lat: number; lon: number };
  zoom?: number;
  layers: SiteLayer[];
  /** Last user locate query (freeform) — optional, not used for codes */
  locateQuery?: string;
}

export interface Jobsite {
  id: string;
  name: string;
  location: string;
  cityState?: string;
  permitNumber: string;
  permittingOffice: string;
  country: "US";
  stateCode?: string;
  isDemo: boolean;
  captainName?: string;
  notes?: string;
  updatedAt?: string;
  /** Industry type drives basic schedule + materials templates */
  industry?: ConstructionIndustry;
  /** Project start date (YYYY-MM-DD) for schedule offsets */
  projectStartDate?: string;
  /** Contract budget ceiling for materials (optional USD) */
  materialsBudget?: number;
  /** Optional user pin + imported/drawn layers (device-local) */
  siteGeo?: SiteGeo;
  reports: FieldReport[];
  messages: AuthorityMessage[];
  inspections: Inspection[];
  contacts: ProjectContact[];
  schedule: ScheduleTask[];
  materials: MaterialLine[];
  dailyLogs?: DailyLogEntry[];
  punchList?: PunchItem[];
  changeOrders?: ChangeOrder[];
}

export interface ProjectIdentity {
  name: string;
  location: string;
  cityState?: string;
  permitNumber: string;
  permittingOffice: string;
  stateCode?: string;
  captainName?: string;
  notes?: string;
  industry?: ConstructionIndustry;
  projectStartDate?: string;
  materialsBudget?: number;
}

export type JobsiteView =
  | "feed"
  | "report"
  | "messages"
  | "inspections"
  | "desk"
  | "project"
  | "schedule"
  | "contacts"
  | "materials";

export interface VisibilityGap {
  unseenCritical: number;
  unseenImportant: number;
  total: number;
  meter: number;
}

export interface ReadinessStatus {
  allClear: boolean;
  openP0Ids: string[];
  openP1Ids: string[];
  failedInspectionIds: string[];
  unwiredP0Ids: string[];
  blockers: string[];
}

export type ActivityKind =
  | "report"
  | "message"
  | "inspection"
  | "schedule"
  | "material";

export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  at: string;
  title: string;
  detail: string;
  priority?: Priority;
  statusLabel: string;
  wired: boolean;
}

export interface JobsitePack {
  /** Primary format is lpin-jobsite-pack. fieldpulse-pack is import-only legacy. */
  format: "lpin-jobsite-pack" | "fieldpulse-pack";
  version: 1;
  exportedAt: string;
  /** Primary app id is lpin-jobsite. fieldpulse is import-only legacy. */
  app: "lpin-jobsite" | "fieldpulse";
  productRegion: "US";
  disclaimer: string;
  jobsite: Jobsite;
}

/** Geometry-focused handoff for GeoLibre / site GIS tools */
export interface SitePack {
  format: "lpin-site-pack";
  version: 1;
  exportedAt: string;
  app: "lpin-jobsite";
  productRegion: "US";
  disclaimer: string;
  /** Project labels for context only — not AHJ keys */
  project?: {
    name?: string;
    stateCode?: string;
    placeLabel?: string;
  };
  siteGeo: SiteGeo;
}

export interface GanttBar {
  id: string;
  kind: "task" | "inspection";
  label: string;
  sublabel: string;
  startDate: string;
  endDate: string;
  status: string;
  progress: number;
  left: number;
  width: number;
  color: string;
  milestone?: boolean;
  contactName?: string;
  division?: TradeDivision;
}
