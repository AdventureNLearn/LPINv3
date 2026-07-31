import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  AuthorityMessage,
  ContactRole,
  FieldReport,
  JobsiteView,
  Inspection,
  InspectionStatus,
  Jobsite,
  MessageDirection,
  Priority,
  ProjectContact,
  ProjectIdentity,
  ReportCategory,
  ReportPhoto,
  Role,
  ScheduleTask,
  ScheduleTaskStatus,
  TradeDivision,
  Urgency,
  ConstructionIndustry,
  MaterialLine,
  MaterialStatus,
  DailyLogEntry,
  PunchItem,
  ChangeOrder,
} from "./types";
import {
  applyProjectIdentity,
  computeVisibilityGap,
  createEmptyJobsite,
  inspectionStatusLabel,
  newId,
  sortInspections,
  sortReports,
} from "./domain";
import { createDemoJobsite } from "./demo";
import { parsePackJson } from "./pack";
import { applyIndustryTemplate } from "./apply-template";

interface JobsiteState {
  jobsite: Jobsite;
  role: Role;
  view: JobsiteView;
  composeReportId?: string;
  setRole: (role: Role) => void;
  setView: (view: JobsiteView) => void;
  loadDemo: () => void;
  startNewProject: (identity?: Partial<ProjectIdentity>) => void;
  updateProject: (identity: ProjectIdentity) => void;
  importJobsite: (jobsite: Jobsite) => void;
  importPackText: (
    raw: string,
  ) => { ok: true } | { ok: false; error: string };
  addReport: (input: {
    title: string;
    body: string;
    priority: Priority;
    urgency: Urgency;
    category: ReportCategory;
    authorName: string;
    sendToAuthority: boolean;
    photos?: ReportPhoto[];
    alsoRequestInspection?: {
      typeLabel: string;
      typeCode?: string;
      scheduledDate: string;
      timeWindow: string;
      buildingArea: string;
    };
  }) => void;
  markSeen: (id: string) => void;
  resolveReport: (id: string) => void;
  reopenReport: (id: string) => void;
  sendMessage: (input: {
    subject: string;
    body: string;
    direction: MessageDirection;
    authorName: string;
    relatedReportId?: string;
    relatedInspectionId?: string;
  }) => void;
  markMessageRead: (id: string) => void;
  requestInspection: (input: {
    typeLabel: string;
    typeCode?: string;
    scheduledDate: string;
    timeWindow: string;
    buildingArea: string;
    notes: string;
    requestedBy: string;
    relatedReportId?: string;
  }) => void;
  updateInspectionStatus: (id: string, status: InspectionStatus) => void;
  messageAboutReport: (reportId: string) => void;
  addContact: (input: {
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
  }) => void;
  updateContact: (id: string, patch: Partial<ProjectContact>) => void;
  removeContact: (id: string) => void;
  addScheduleTask: (input: {
    title: string;
    division: TradeDivision;
    startDate: string;
    endDate: string;
    status: ScheduleTaskStatus;
    progress: number;
    contactId?: string;
    notes?: string;
    milestone?: boolean;
    relatedInspectionId?: string;
    relatedReportId?: string;
    dependsOnIds?: string[];
  }) => void;
  addDailyLog: (input: {
    date: string;
    weatherNote?: string;
    crewCount?: number;
    workDone: string;
    delays?: string;
    safetyNote?: string;
    authorName: string;
  }) => void;
  addPunchItem: (input: {
    title: string;
    location: string;
    trade?: string;
    notes?: string;
  }) => void;
  updatePunchItem: (id: string, patch: Partial<PunchItem>) => void;
  removePunchItem: (id: string) => void;
  addChangeOrder: (input: {
    number: string;
    title: string;
    amount?: number;
    status: ChangeOrder["status"];
    notes?: string;
  }) => void;
  updateChangeOrder: (id: string, patch: Partial<ChangeOrder>) => void;
  updateInspectionChecklist: (
    id: string,
    checklist: { templateId: string; checked: Record<string, boolean> },
  ) => void;
  updateScheduleTask: (id: string, patch: Partial<ScheduleTask>) => void;
  removeScheduleTask: (id: string) => void;
  applyIndustrySchedule: (
    industry: ConstructionIndustry,
    projectStartDate?: string,
  ) => void;
  addMaterial: (input: {
    name: string;
    division: TradeDivision;
    unit: string;
    qtyRequired: number;
    qtyOnHand: number;
    unitCost: number;
    quotedUnitCost?: number;
    status: MaterialStatus;
    vendorContactId?: string;
    scheduleTaskId?: string;
    specNote?: string;
    poNote?: string;
  }) => void;
  updateMaterial: (id: string, patch: Partial<MaterialLine>) => void;
  removeMaterial: (id: string) => void;
  sortedReports: () => FieldReport[];
  sortedInspections: () => Inspection[];
  gap: () => ReturnType<typeof computeVisibilityGap>;
}

function roleDeskLabel(role: Role): string {
  switch (role) {
    case "owner":
      return "Owner / developer";
    case "office":
      return "Office desk";
    case "authority":
      return "Building department";
    default:
      return "Jobsite lead";
  }
}

function directionForRole(role: Role): MessageDirection {
  if (role === "authority") return "authority_to_field";
  if (role === "office" || role === "owner") return "office_to_authority";
  return "field_to_authority";
}

function touch(jobsite: Jobsite): Jobsite {
  return {
    ...jobsite,
    country: "US",
    contacts: jobsite.contacts ?? [],
    schedule: jobsite.schedule ?? [],
    materials: jobsite.materials ?? [],
    dailyLogs: jobsite.dailyLogs ?? [],
    punchList: jobsite.punchList ?? [],
    changeOrders: jobsite.changeOrders ?? [],
    updatedAt: new Date().toISOString(),
  };
}

function migrateJobsite(raw: unknown): Jobsite {
  if (!raw || typeof raw !== "object") return createDemoJobsite();
  const j = raw as Partial<Jobsite>;
  return {
    id: j.id || newId("js"),
    name: j.name || "Jobsite",
    location: j.location || "United States",
    cityState: j.cityState,
    permitNumber: j.permitNumber || "TBD",
    permittingOffice: j.permittingOffice || "City / County Building Department",
    country: "US",
    stateCode: j.stateCode,
    isDemo: j.isDemo ?? j.id === "js_sample_demo",
    captainName: j.captainName,
    notes: j.notes,
    updatedAt: j.updatedAt || new Date().toISOString(),
    reports: Array.isArray(j.reports) ? j.reports : [],
    messages: Array.isArray(j.messages) ? j.messages : [],
    inspections: Array.isArray(j.inspections) ? j.inspections : [],
    contacts: Array.isArray(j.contacts) ? j.contacts : [],
    schedule: Array.isArray(j.schedule) ? j.schedule : [],
    materials: Array.isArray(j.materials) ? j.materials : [],
    dailyLogs: Array.isArray(j.dailyLogs) ? j.dailyLogs : [],
    punchList: Array.isArray(j.punchList) ? j.punchList : [],
    changeOrders: Array.isArray(j.changeOrders) ? j.changeOrders : [],
    industry: j.industry,
    projectStartDate: j.projectStartDate,
    materialsBudget: j.materialsBudget,
  };
}


/** One-time copy of retired Fieldpulse localStorage keys into lpin-jobsite-v1. */
function migrateLegacyJobsiteStorage() {
  if (typeof window === "undefined" || !window.localStorage) return;
  const next = "lpin-jobsite-v1";
  if (window.localStorage.getItem(next)) return;
  for (const old of ["aos-fieldpulse-v6", "aos-fieldpulse-v3", "aos-fieldpulse-v2"]) {
    const raw = window.localStorage.getItem(old);
    if (raw) {
      try {
        window.localStorage.setItem(next, raw);
        window.localStorage.removeItem(old);
      } catch {
        // ignore quota / private mode
      }
      return;
    }
  }
}
migrateLegacyJobsiteStorage();

export const useJobsiteStore = create<JobsiteState>()(
  persist(
    (set, get) => ({
      jobsite: createDemoJobsite(),
      role: "field",
      view: "feed",
      setRole: (role) => set({ role }),
      setView: (view) => set({ view }),
      loadDemo: () =>
        set({
          jobsite: createDemoJobsite(),
          view: "feed",
          role: "field",
          composeReportId: undefined,
        }),

      startNewProject: (identity) =>
        set({
          // touch() guarantees materials/schedule arrays for every lane after blank
          jobsite: touch(
            createEmptyJobsite({
              name: "My jobsite",
              location: "United States",
              permitNumber: "TBD",
              permittingOffice: "City / County Building Department",
              ...identity,
              // Blank board never inherits demo state or a pre-picked state code
              stateCode: identity?.stateCode,
              cityState: identity?.cityState,
            }),
          ),
          view: "project",
          role: "field",
          composeReportId: undefined,
        }),

      updateProject: (identity) => {
        const jobsite = get().jobsite;
        set({ jobsite: applyProjectIdentity(jobsite, identity) });
      },

      importJobsite: (jobsite) =>
        set({
          jobsite: touch({
            ...jobsite,
            isDemo: false,
            country: "US",
            contacts: jobsite.contacts ?? [],
            schedule: jobsite.schedule ?? [],
          }),
          view: "feed",
          composeReportId: undefined,
        }),

      importPackText: (raw) => {
        const parsed = parsePackJson(raw);
        if (!parsed.ok) return parsed;
        get().importJobsite(parsed.jobsite);
        return { ok: true as const };
      },

      addReport: (input) => {
        const role = get().role;
        const reportId = newId("fr");
        const msgId = newId("msg");
        const now = new Date().toISOString();

        const report: FieldReport = {
          id: reportId,
          title: input.title.trim(),
          body: input.body.trim(),
          priority: input.priority,
          urgency: input.urgency,
          category: input.category,
          authorRole: role,
          authorName: input.authorName.trim() || roleDeskLabel(role),
          status: "open",
          createdAt: now,
          sendToAuthority: input.sendToAuthority,
          relatedMessageId: input.sendToAuthority ? msgId : undefined,
          photos: input.photos?.length ? input.photos : undefined,
        };

        const jobsite = get().jobsite;
        let messages = [...jobsite.messages];
        let inspections = [...jobsite.inspections];
        let finalReport = report;

        if (input.sendToAuthority) {
          const photoNote =
            report.photos && report.photos.length
              ? `\nPhotos on board: ${report.photos.length} (see print packet / project pack).`
              : "";
          const notice: AuthorityMessage = {
            id: msgId,
            direction: directionForRole(role),
            subject: `Active field report: ${report.title}`,
            body: [
              report.body,
              photoNote,
              "",
              `Priority: ${report.priority}`,
              `Category: ${report.category}`,
              `Jobsite: ${jobsite.name}`,
              `Permit: ${jobsite.permitNumber}`,
              "",
              "— Auto-wired from active field reporting to the building department lane",
            ]
              .filter(Boolean)
              .join("\n"),
            authorName: report.authorName,
            authorRole: role,
            status: "sent",
            createdAt: now,
            relatedReportId: reportId,
            wiredFrom: "report",
          };
          messages = [notice, ...messages];
        }

        if (input.alsoRequestInspection) {
          const inspId = newId("insp");
          const inspMsgId = newId("msg");
          const insp = input.alsoRequestInspection;
          const inspection: Inspection = {
            id: inspId,
            typeLabel: insp.typeLabel.trim(),
            typeCode: insp.typeCode?.trim() || undefined,
            scheduledDate: insp.scheduledDate,
            timeWindow: insp.timeWindow.trim() || "To be assigned",
            buildingArea: insp.buildingArea.trim() || "See field report",
            status: "requested",
            requestedBy: report.authorName,
            notes: `Linked to field report: ${report.title}\n\n${report.body}`,
            authorityOffice: jobsite.permittingOffice,
            createdAt: now,
            updatedAt: now,
            relatedReportId: reportId,
            relatedMessageId: inspMsgId,
          };
          const inspNotice: AuthorityMessage = {
            id: inspMsgId,
            direction: directionForRole(role),
            subject: `Inspection request (wired): ${inspection.typeLabel}`,
            body: [
              `Please schedule: ${inspection.typeLabel}${
                inspection.typeCode ? ` (${inspection.typeCode})` : ""
              }.`,
              `Area: ${inspection.buildingArea}`,
              `Preferred date: ${inspection.scheduledDate}`,
              `Window: ${inspection.timeWindow}`,
              "",
              `Linked field report: ${report.title}`,
              report.body,
              "",
              `Permit: ${jobsite.permitNumber}`,
              "— Auto-wired inspection request from field reporting",
            ].join("\n"),
            authorName: report.authorName,
            authorRole: role,
            status: "sent",
            createdAt: now,
            relatedReportId: reportId,
            relatedInspectionId: inspId,
            wiredFrom: "inspection",
          };
          inspections = [inspection, ...inspections];
          messages = [inspNotice, ...messages];
          finalReport = {
            ...report,
            relatedInspectionId: inspId,
            sendToAuthority: true,
            relatedMessageId: report.relatedMessageId ?? inspMsgId,
          };
        }

        set({
          jobsite: touch({
            ...jobsite,
            isDemo: false,
            reports: [finalReport, ...jobsite.reports],
            messages,
            inspections,
          }),
          view: "feed",
        });
      },

      markSeen: (id) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            reports: jobsite.reports.map((r) =>
              r.id === id && r.status === "open"
                ? {
                    ...r,
                    status: "seen" as const,
                    seenAt: new Date().toISOString(),
                    seenBy: roleDeskLabel(get().role),
                  }
                : r,
            ),
          }),
        });
      },

      resolveReport: (id) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            reports: jobsite.reports.map((r) =>
              r.id === id ? { ...r, status: "resolved" as const } : r,
            ),
          }),
        });
      },

      reopenReport: (id) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            reports: jobsite.reports.map((r) =>
              r.id === id
                ? {
                    ...r,
                    status: "open" as const,
                    seenAt: undefined,
                    seenBy: undefined,
                  }
                : r,
            ),
          }),
        });
      },

      sendMessage: (input) => {
        const msg: AuthorityMessage = {
          id: newId("msg"),
          direction: input.direction,
          subject: input.subject.trim(),
          body: input.body.trim(),
          authorName:
            input.authorName.trim() || roleDeskLabel(get().role),
          authorRole: get().role,
          status: "sent",
          createdAt: new Date().toISOString(),
          relatedReportId: input.relatedReportId,
          relatedInspectionId: input.relatedInspectionId,
          wiredFrom: "manual",
        };
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            messages: [msg, ...jobsite.messages],
          }),
          view: "messages",
        });
      },

      markMessageRead: (id) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            messages: jobsite.messages.map((m) =>
              m.id === id && m.status === "sent"
                ? { ...m, status: "read" as const }
                : m,
            ),
          }),
        });
      },

      requestInspection: (input) => {
        const role = get().role;
        const inspId = newId("insp");
        const msgId = newId("msg");
        const now = new Date().toISOString();
        const jobsite = get().jobsite;

        const inspection: Inspection = {
          id: inspId,
          typeLabel: input.typeLabel.trim(),
          typeCode: input.typeCode?.trim() || undefined,
          scheduledDate: input.scheduledDate,
          timeWindow: input.timeWindow.trim() || "To be assigned",
          buildingArea: input.buildingArea.trim(),
          status: "requested",
          requestedBy:
            input.requestedBy.trim() || roleDeskLabel(role),
          notes: input.notes.trim(),
          authorityOffice: jobsite.permittingOffice,
          createdAt: now,
          updatedAt: now,
          relatedReportId: input.relatedReportId,
          relatedMessageId: msgId,
        };

        const notice: AuthorityMessage = {
          id: msgId,
          direction: directionForRole(role),
          subject: `Inspection request: ${inspection.typeLabel}`,
          body: [
            `Please schedule: ${inspection.typeLabel}${
              inspection.typeCode ? ` (${inspection.typeCode})` : ""
            }.`,
            `Area: ${inspection.buildingArea}`,
            `Preferred date: ${inspection.scheduledDate}`,
            `Window: ${inspection.timeWindow}`,
            "",
            inspection.notes || "No extra notes.",
            "",
            `Jobsite: ${jobsite.name}`,
            `Permit: ${jobsite.permitNumber}`,
            "— Wired inspection scheduling → building department lane",
          ].join("\n"),
          authorName: inspection.requestedBy,
          authorRole: role,
          status: "sent",
          createdAt: now,
          relatedInspectionId: inspId,
          relatedReportId: input.relatedReportId,
          wiredFrom: "inspection",
        };

        const reports = jobsite.reports.map((r) =>
          input.relatedReportId && r.id === input.relatedReportId
            ? {
                ...r,
                sendToAuthority: true,
                relatedInspectionId: inspId,
                relatedMessageId: r.relatedMessageId ?? msgId,
              }
            : r,
        );

        set({
          jobsite: touch({
            ...jobsite,
            inspections: [inspection, ...jobsite.inspections],
            messages: [notice, ...jobsite.messages],
            reports,
          }),
          view: "inspections",
        });
      },

      updateInspectionStatus: (id, status) => {
        const jobsite = get().jobsite;
        const role = get().role;
        const current = jobsite.inspections.find((i) => i.id === id);
        if (!current) return;

        const now = new Date().toISOString();
        const updated: Inspection = {
          ...current,
          status,
          updatedAt: now,
          ...(status === "scheduled" &&
          current.timeWindow === "To be assigned"
            ? { timeWindow: "8:00 AM – 12:00 PM (assigned)" }
            : {}),
        };

        const statusMsg: AuthorityMessage = {
          id: newId("msg"),
          direction:
            role === "authority"
              ? "authority_to_field"
              : directionForRole(role),
          subject: `Inspection update: ${updated.typeLabel} → ${inspectionStatusLabel(status)}`,
          body: [
            `Status changed to: ${inspectionStatusLabel(status)}.`,
            `Inspection: ${updated.typeLabel}${
              updated.typeCode ? ` (${updated.typeCode})` : ""
            }`,
            `Area: ${updated.buildingArea}`,
            `Date: ${updated.scheduledDate}`,
            `Window: ${updated.timeWindow}`,
            "",
            inspectionStatusHelpLine(status),
            "",
            "— Wired from inspection scheduling",
          ].join("\n"),
          authorName: roleDeskLabel(role),
          authorRole: role,
          status: "sent",
          createdAt: now,
          relatedInspectionId: id,
          relatedReportId: updated.relatedReportId,
          wiredFrom: "inspection",
        };

        set({
          jobsite: touch({
            ...jobsite,
            inspections: jobsite.inspections.map((i) =>
              i.id === id ? updated : i,
            ),
            messages: [statusMsg, ...jobsite.messages],
          }),
        });
      },

      messageAboutReport: (reportId) => {
        const report = get().jobsite.reports.find((r) => r.id === reportId);
        if (!report) return;
        set({ view: "messages", composeReportId: reportId });
      },

      addContact: (input) => {
        const now = new Date().toISOString();
        const contact: ProjectContact = {
          id: newId("ct"),
          company: input.company.trim(),
          contactName: input.contactName.trim(),
          division: input.division,
          role: input.role,
          phone: input.phone?.trim() || undefined,
          email: input.email?.trim() || undefined,
          scope: input.scope.trim(),
          inventoryNotes: input.inventoryNotes?.trim() || undefined,
          conditionNotes: input.conditionNotes?.trim() || undefined,
          leadTime: input.leadTime?.trim() || undefined,
          active: true,
          createdAt: now,
          updatedAt: now,
        };
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            isDemo: false,
            contacts: [contact, ...(jobsite.contacts ?? [])],
          }),
        });
      },

      updateContact: (id, patch) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            contacts: (jobsite.contacts ?? []).map((c) =>
              c.id === id
                ? {
                    ...c,
                    ...patch,
                    id: c.id,
                    updatedAt: new Date().toISOString(),
                  }
                : c,
            ),
          }),
        });
      },

      removeContact: (id) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            contacts: (jobsite.contacts ?? []).filter((c) => c.id !== id),
            schedule: (jobsite.schedule ?? []).map((s) =>
              s.contactId === id ? { ...s, contactId: undefined } : s,
            ),
          }),
        });
      },

      addScheduleTask: (input) => {
        const now = new Date().toISOString();
        const task: ScheduleTask = {
          id: newId("sch"),
          title: input.title.trim(),
          division: input.division,
          startDate: input.startDate,
          endDate: input.endDate || input.startDate,
          status: input.status,
          progress: Math.min(100, Math.max(0, input.progress)),
          contactId: input.contactId,
          notes: input.notes?.trim() || undefined,
          milestone: input.milestone,
          relatedInspectionId: input.relatedInspectionId,
          relatedReportId: input.relatedReportId,
          dependsOnIds: input.dependsOnIds,
          createdAt: now,
          updatedAt: now,
        };
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            isDemo: false,
            schedule: [task, ...(jobsite.schedule ?? [])],
          }),
          view: "schedule",
        });
      },

      updateScheduleTask: (id, patch) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            schedule: (jobsite.schedule ?? []).map((s) =>
              s.id === id
                ? {
                    ...s,
                    ...patch,
                    id: s.id,
                    updatedAt: new Date().toISOString(),
                  }
                : s,
            ),
          }),
        });
      },

      removeScheduleTask: (id) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            schedule: (jobsite.schedule ?? []).filter((s) => s.id !== id),
          }),
        });
      },

      applyIndustrySchedule: (industry, projectStartDate) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch(
            applyIndustryTemplate(jobsite, industry, projectStartDate, {
              replaceSchedule: true,
              replaceMaterials: true,
            }),
          ),
          view: "schedule",
        });
      },

      addMaterial: (input) => {
        const now = new Date().toISOString();
        const line: MaterialLine = {
          id: newId("mat"),
          name: input.name.trim(),
          division: input.division,
          unit: input.unit.trim() || "ea",
          qtyRequired: Math.max(0, input.qtyRequired),
          qtyOnHand: Math.max(0, input.qtyOnHand),
          unitCost: Math.max(0, input.unitCost),
          quotedUnitCost: input.quotedUnitCost,
          status: input.status,
          vendorContactId: input.vendorContactId,
          scheduleTaskId: input.scheduleTaskId,
          specNote: input.specNote?.trim() || undefined,
          poNote: input.poNote?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            isDemo: false,
            materials: [line, ...(jobsite.materials ?? [])],
          }),
          view: "materials",
        });
      },

      updateMaterial: (id, patch) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            materials: (jobsite.materials ?? []).map((m) =>
              m.id === id
                ? {
                    ...m,
                    ...patch,
                    id: m.id,
                    updatedAt: new Date().toISOString(),
                  }
                : m,
            ),
          }),
        });
      },

      removeMaterial: (id) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            materials: (jobsite.materials ?? []).filter((m) => m.id !== id),
          }),
        });
      },

      addDailyLog: (input) => {
        const now = new Date().toISOString();
        const entry: DailyLogEntry = {
          id: newId("log"),
          date: input.date,
          weatherNote: input.weatherNote?.trim() || undefined,
          crewCount: input.crewCount,
          workDone: input.workDone.trim(),
          delays: input.delays?.trim() || undefined,
          safetyNote: input.safetyNote?.trim() || undefined,
          authorName: input.authorName.trim() || "Field",
          createdAt: now,
        };
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            isDemo: false,
            dailyLogs: [entry, ...(jobsite.dailyLogs ?? [])],
          }),
        });
      },

      addPunchItem: (input) => {
        const now = new Date().toISOString();
        const item: PunchItem = {
          id: newId("punch"),
          title: input.title.trim(),
          location: input.location.trim(),
          trade: input.trade?.trim() || undefined,
          status: "open",
          notes: input.notes?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            isDemo: false,
            punchList: [item, ...(jobsite.punchList ?? [])],
          }),
        });
      },

      updatePunchItem: (id, patch) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            punchList: (jobsite.punchList ?? []).map((p) =>
              p.id === id
                ? {
                    ...p,
                    ...patch,
                    id: p.id,
                    updatedAt: new Date().toISOString(),
                  }
                : p,
            ),
          }),
        });
      },

      removePunchItem: (id) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            punchList: (jobsite.punchList ?? []).filter((p) => p.id !== id),
          }),
        });
      },

      addChangeOrder: (input) => {
        const now = new Date().toISOString();
        const co: ChangeOrder = {
          id: newId("co"),
          number: input.number.trim(),
          title: input.title.trim(),
          amount: input.amount,
          status: input.status,
          notes: input.notes?.trim() || undefined,
          createdAt: now,
          updatedAt: now,
        };
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            isDemo: false,
            changeOrders: [co, ...(jobsite.changeOrders ?? [])],
          }),
        });
      },

      updateChangeOrder: (id, patch) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            changeOrders: (jobsite.changeOrders ?? []).map((c) =>
              c.id === id
                ? {
                    ...c,
                    ...patch,
                    id: c.id,
                    updatedAt: new Date().toISOString(),
                  }
                : c,
            ),
          }),
        });
      },

      updateInspectionChecklist: (id, checklist) => {
        const jobsite = get().jobsite;
        set({
          jobsite: touch({
            ...jobsite,
            inspections: jobsite.inspections.map((i) =>
              i.id === id
                ? {
                    ...i,
                    checklist,
                    updatedAt: new Date().toISOString(),
                  }
                : i,
            ),
          }),
        });
      },

      sortedReports: () => sortReports(get().jobsite.reports),
      sortedInspections: () => sortInspections(get().jobsite.inspections),
      gap: () => computeVisibilityGap(get().jobsite.reports),
    }),
    {
      name: "lpin-jobsite-v1",
      version: 6,
      migrate: (persisted) => {
        const p = (persisted ?? {}) as {
          jobsite?: unknown;
          role?: Role;
          view?: JobsiteView;
        };
        const views: JobsiteView[] = [
          "feed",
          "report",
          "messages",
          "inspections",
          "desk",
          "project",
          "schedule",
          "contacts",
          "materials",
        ];
        return {
          jobsite: migrateJobsite(p.jobsite),
          role:
            p.role === "authority" ||
            p.role === "office" ||
            p.role === "owner" ||
            p.role === "field"
              ? p.role
              : "field",
          view: p.view && views.includes(p.view) ? p.view : "feed",
        };
      },
      partialize: (s) => ({
        jobsite: s.jobsite,
        role: s.role,
        view: s.view === "report" ? "feed" : s.view,
      }),
    },
  ),
);

function inspectionStatusHelpLine(s: InspectionStatus): string {
  switch (s) {
    case "requested":
      return "Waiting on the building department for a calendar slot.";
    case "scheduled":
      return "On the calendar — prepare the area for the inspector.";
    case "ready_for_inspector":
      return "Crew reports the work is open and ready for the walk.";
    case "passed":
      return "Passed. Keep this record with your permit file.";
    case "failed":
      return "Did not pass. Correct items before re-inspection; do not cover work.";
    case "cancelled":
      return "Cancelled. Request a new inspection if still needed.";
  }
}
