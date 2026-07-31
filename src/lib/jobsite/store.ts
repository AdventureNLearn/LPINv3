import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  applyProjectIdentity,
  createDemoJobsite,
  createEmptyJobsite,
} from "./demo";
import { MAX_PHOTOS_PER_PROJECT } from "./photo";
import { parsePackJson } from "./pack";
import type {
  FieldReport,
  Inspection,
  JobsiteProject,
  LogLane,
  MaterialLine,
  MobileTab,
  PhotoNote,
  Priority,
  ProjectContact,
  ProjectIdentity,
  ProjectMeta,
  ReportCategory,
  RoleLens,
  ScheduleItem,
  SiteGeo,
} from "./types";
import { roleAuthorName } from "./types";
import { uid } from "@/lib/utils";

const PRIORITY_RANK: Record<Priority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

function metaOf(p: JobsiteProject): ProjectMeta {
  return {
    id: p.id,
    name: p.name,
    stateCode: p.stateCode,
    isDemo: p.isDemo,
    industry: p.industry,
    updatedAt: p.updatedAt,
  };
}

function withProject(
  list: JobsiteProject[],
  project: JobsiteProject,
): JobsiteProject[] {
  const i = list.findIndex((p) => p.id === project.id);
  if (i < 0) return [project, ...list];
  const next = [...list];
  next[i] = project;
  return next;
}

function normalizeProject(j: JobsiteProject): JobsiteProject {
  return {
    ...j,
    country: "US",
    captainName: j.captainName ?? "",
    notes: j.notes ?? "",
    photos: Array.isArray(j.photos) ? j.photos : [],
    fieldComms: j.fieldComms ?? {
      version: 1 as const,
      projectId: j.id,
      messages: [],
      generatedAt: new Date().toISOString(),
    },
    site: j.site ?? { version: 1 as const },
  };
}

export type NewPhotoInput = {
  dataUrl: string;
  caption?: string;
  area?: string;
  source: "camera" | "library";
  width?: number;
  height?: number;
  bytesApprox?: number;
};

interface JobsiteState {
  projects: JobsiteProject[];
  activeId: string;
  tab: MobileTab;
  role: RoleLens;
  logLane: LogLane;
  logDivision: string;
  setupSection: "identity" | "portfolio" | "handoff" | "role";

  project: JobsiteProject;

  setTab: (t: MobileTab) => void;
  setRole: (r: RoleLens) => void;
  setLogLane: (l: LogLane) => void;
  setLogDivision: (d: string) => void;
  setSetupSection: (s: JobsiteState["setupSection"]) => void;

  listMeta: () => ProjectMeta[];
  switchProject: (id: string) => void;
  startNewProject: (identity?: Partial<ProjectIdentity>) => void;
  updateProject: (identity: ProjectIdentity) => void;
  loadDemo: () => void;
  deleteProject: (id: string) => void;
  importProject: (
    raw: string,
  ) => { ok: true } | { ok: false; error: string };

  markReport: (id: string, status: FieldReport["status"], by?: string) => void;
  addReport: (input: {
    title: string;
    body: string;
    priority: Priority;
    category: ReportCategory;
    sendToAuthority: boolean;
    area?: string;
    photoIds?: string[];
    newPhotos?: NewPhotoInput[];
  }) => { ok: true } | { ok: false; error: string };
  addAuthorityMessage: (input: {
    subject: string;
    body: string;
    direction: "field_to_authority" | "internal" | "office_to_authority";
  }) => void;
  ackFieldComm: (id: string) => void;

  addPhotoNote: (input: {
    dataUrl: string;
    caption: string;
    area?: string;
    source: "camera" | "library";
    relatedReportId?: string;
    width?: number;
    height?: number;
    bytesApprox?: number;
  }) => { ok: true; id: string } | { ok: false; error: string };
  removePhotoNote: (id: string) => void;
  linkPhotoToReport: (photoId: string, reportId: string) => void;

  upsertContact: (c: Omit<ProjectContact, "id"> & { id?: string }) => void;
  removeContact: (id: string) => void;
  upsertInspection: (c: Omit<Inspection, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }) => void;
  removeInspection: (id: string) => void;
  upsertMaterial: (c: Omit<MaterialLine, "id"> & { id?: string }) => void;
  removeMaterial: (id: string) => void;
  upsertSchedule: (c: Omit<ScheduleItem, "id"> & { id?: string }) => void;
  removeSchedule: (id: string) => void;

  setSiteGeo: (site: SiteGeo) => void;
  setSitePin: (lat: number, lon: number, label?: string) => void;
  clearSitePin: () => void;
  setBoundaryRing: (ring: [number, number][]) => void;
  pushBoundaryVertex: (lon: number, lat: number) => void;
  clearBoundary: () => void;
}

function patchActive(
  set: (
    fn: (s: JobsiteState) => Partial<JobsiteState> | JobsiteState,
  ) => void,
  updater: (p: JobsiteProject) => JobsiteProject,
) {
  set((s) => {
    const cur = s.projects.find((p) => p.id === s.activeId) ?? s.project;
    const next = updater({
      ...cur,
      updatedAt: new Date().toISOString(),
    });
    const projects = withProject(s.projects, next);
    return { projects, project: next, activeId: next.id };
  });
}

const initialDemo = createDemoJobsite();

export function openP0Count(project: JobsiteProject): number {
  return project.reports.filter(
    (r) => r.priority === "P0" && r.status !== "resolved",
  ).length;
}

export function canAllClear(project: JobsiteProject): boolean {
  return openP0Count(project) === 0;
}

export function sortedReports(project: JobsiteProject): FieldReport[] {
  return [...project.reports].sort((a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    const st =
      (a.status === "resolved" ? 1 : 0) - (b.status === "resolved" ? 1 : 0);
    if (st !== 0) return st;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function openAckCount(project: JobsiteProject): number {
  return project.fieldComms.messages.filter(
    (m) => m.ackRequired && !m.acked,
  ).length;
}

export const useJobsiteStore = create<JobsiteState>()(
  persist(
    (set, get) => ({
      projects: [initialDemo],
      activeId: initialDemo.id,
      project: initialDemo,
      tab: "board",
      role: "field",
      logLane: "all",
      logDivision: "ALL",
      setupSection: "identity",

      setTab: (tab) => set({ tab }),
      setRole: (role) => set({ role }),
      setLogLane: (logLane) => set({ logLane }),
      setLogDivision: (logDivision) => set({ logDivision }),
      setSetupSection: (setupSection) => set({ setupSection }),

      listMeta: () => get().projects.map(metaOf),

      switchProject: (id) => {
        const p = get().projects.find((x) => x.id === id);
        if (!p) return;
        set({ activeId: id, project: p, tab: "board" });
      },

      startNewProject: (identity) => {
        const blank = createEmptyJobsite(identity);
        set((s) => ({
          projects: [blank, ...s.projects.filter((p) => p.id !== blank.id)],
          activeId: blank.id,
          project: blank,
          tab: "setup",
          setupSection: "identity",
        }));
      },

      updateProject: (identity) => {
        patchActive(set, (p) => applyProjectIdentity(p, identity));
      },

      loadDemo: () => {
        const demo = createDemoJobsite();
        set((s) => ({
          projects: withProject(
            s.projects.filter((p) => p.id !== demo.id),
            demo,
          ),
          activeId: demo.id,
          project: demo,
          tab: "board",
        }));
      },

      deleteProject: (id) => {
        set((s) => {
          let projects = s.projects.filter((p) => p.id !== id);
          if (projects.length === 0) {
            projects = [createDemoJobsite()];
          }
          const activeId =
            s.activeId === id ? projects[0]!.id : s.activeId;
          const project =
            projects.find((p) => p.id === activeId) ?? projects[0]!;
          return { projects, activeId: project.id, project, tab: "board" };
        });
      },

      importProject: (raw) => {
        const parsed = parsePackJson(raw);
        if (!parsed.ok) return parsed;
        const project = normalizeProject({ ...parsed.project, isDemo: false });
        set((s) => ({
          projects: withProject(s.projects, project),
          activeId: project.id,
          project,
          tab: "board",
        }));
        return { ok: true as const };
      },

      markReport: (id, status, by) =>
        patchActive(set, (p) => ({
          ...p,
          reports: p.reports.map((r) =>
            r.id === id
              ? {
                  ...r,
                  status,
                  seenAt:
                    status === "seen" || status === "resolved"
                      ? new Date().toISOString()
                      : r.seenAt,
                  seenBy: by ?? r.seenBy,
                }
              : r,
          ),
        })),

      addReport: (input) => {
        const role = get().role;
        const existing = get().project;
        const incoming = input.newPhotos ?? [];
        if (
          (existing.photos?.length ?? 0) + incoming.length >
          MAX_PHOTOS_PER_PROJECT
        ) {
          return {
            ok: false as const,
            error: `Photo limit (${MAX_PHOTOS_PER_PROJECT}) would be exceeded.`,
          };
        }

        patchActive(set, (p) => {
          const reportId = uid("fr");
          const createdAt = new Date().toISOString();
          const newNotes: PhotoNote[] = incoming.map((ph) => ({
            id: uid("ph"),
            dataUrl: ph.dataUrl,
            caption: (ph.caption ?? input.title).trim() || "Report photo",
            area: (ph.area ?? input.area)?.trim() || undefined,
            authorRole: role,
            authorName: roleAuthorName(role),
            createdAt,
            source: ph.source,
            relatedReportId: reportId,
            width: ph.width,
            height: ph.height,
            bytesApprox: ph.bytesApprox,
          }));
          const photoIds = [
            ...(input.photoIds?.filter(Boolean) ?? []),
            ...newNotes.map((n) => n.id),
          ];
          const report: FieldReport = {
            id: reportId,
            title: input.title.trim(),
            body: input.body.trim(),
            priority: input.priority,
            urgency:
              input.priority === "P0"
                ? "immediate"
                : input.priority === "P1"
                  ? "today"
                  : "this_week",
            category: input.category,
            authorRole: role,
            authorName: roleAuthorName(role),
            status: "open",
            createdAt,
            sendToAuthority: input.sendToAuthority,
            area: input.area?.trim() || undefined,
            photoIds: photoIds.length ? photoIds : undefined,
          };
          const wired = input.sendToAuthority
            ? [
                {
                  id: uid("msg"),
                  direction: "field_to_authority" as const,
                  subject: `Active field report: ${report.title}`,
                  body: `${report.body}\n\n— Wired from mobile field report · role: ${roleAuthorName(role)}${
                    photoIds.length
                      ? `\n— ${photoIds.length} photo note(s) attached`
                      : ""
                  }`,
                  authorName: report.authorName,
                  authorRole: report.authorRole,
                  status: "sent" as const,
                  createdAt,
                  relatedReportId: report.id,
                  wiredFrom: "report" as const,
                },
              ]
            : [];
          const photos = [
            ...newNotes,
            ...(p.photos ?? []).map((ph) =>
              photoIds.includes(ph.id)
                ? { ...ph, relatedReportId: reportId }
                : ph,
            ),
          ];
          return {
            ...p,
            reports: [report, ...p.reports],
            messages: [...wired, ...p.messages],
            photos,
            fieldComms: {
              ...p.fieldComms,
              messages: [
                {
                  id: uid("cm"),
                  projectId: p.id,
                  kind: "status_update",
                  phase: "active_work",
                  division: "00",
                  scopes: ["00"],
                  fromRole: role,
                  toRoles: input.sendToAuthority
                    ? ["super", "bd"]
                    : ["super", "foreman"],
                  fromName: report.authorName,
                  toNames: input.sendToAuthority
                    ? ["Super", "BD lane"]
                    : ["Super", "Foreman"],
                  text: `${report.priority} ${report.title}: ${report.body}${
                    photoIds.length
                      ? ` · ${photoIds.length} photo note(s)`
                      : ""
                  }`,
                  ackRequired: report.priority === "P0",
                  acked: false,
                  createdAt,
                },
                ...p.fieldComms.messages,
              ],
            },
          };
        });
        return { ok: true as const };
      },

      addAuthorityMessage: (input) =>
        patchActive(set, (p) => {
          const role = get().role;
          return {
            ...p,
            messages: [
              {
                id: uid("msg"),
                direction: input.direction,
                subject: input.subject.trim(),
                body: input.body.trim(),
                authorName: roleAuthorName(role),
                authorRole: role,
                status: "sent",
                createdAt: new Date().toISOString(),
                wiredFrom: "manual",
              },
              ...p.messages,
            ],
          };
        }),

      ackFieldComm: (id) =>
        patchActive(set, (p) => ({
          ...p,
          fieldComms: {
            ...p.fieldComms,
            messages: p.fieldComms.messages.map((m) =>
              m.id === id ? { ...m, acked: true } : m,
            ),
          },
        })),

      addPhotoNote: (input) => {
        const p = get().project;
        if ((p.photos?.length ?? 0) >= MAX_PHOTOS_PER_PROJECT) {
          return {
            ok: false as const,
            error: `Photo limit (${MAX_PHOTOS_PER_PROJECT}) reached for this project. Remove older notes or export a pack.`,
          };
        }
        const role = get().role;
        const id = uid("ph");
        const note: PhotoNote = {
          id,
          dataUrl: input.dataUrl,
          caption: input.caption.trim(),
          area: input.area?.trim() || undefined,
          authorRole: role,
          authorName: roleAuthorName(role),
          createdAt: new Date().toISOString(),
          source: input.source,
          relatedReportId: input.relatedReportId,
          width: input.width,
          height: input.height,
          bytesApprox: input.bytesApprox,
        };
        patchActive(set, (proj) => {
          let reports = proj.reports;
          if (input.relatedReportId) {
            reports = proj.reports.map((r) =>
              r.id === input.relatedReportId
                ? {
                    ...r,
                    photoIds: [...(r.photoIds ?? []), id],
                  }
                : r,
            );
          }
          return {
            ...proj,
            photos: [note, ...(proj.photos ?? [])],
            reports,
            fieldComms: {
              ...proj.fieldComms,
              messages: [
                {
                  id: uid("cm"),
                  projectId: proj.id,
                  kind: "status_update",
                  phase: "active_work",
                  division: "00",
                  fromRole: role,
                  toRoles: ["super", "foreman"],
                  fromName: note.authorName,
                  toNames: ["Super", "Foreman"],
                  text: `Photo note: ${note.caption || "(no caption)"}${
                    note.area ? ` · ${note.area}` : ""
                  }`,
                  createdAt: note.createdAt,
                },
                ...proj.fieldComms.messages,
              ],
            },
          };
        });
        return { ok: true as const, id };
      },

      removePhotoNote: (id) =>
        patchActive(set, (p) => ({
          ...p,
          photos: (p.photos ?? []).filter((ph) => ph.id !== id),
          reports: p.reports.map((r) =>
            r.photoIds?.includes(id)
              ? {
                  ...r,
                  photoIds: r.photoIds.filter((x) => x !== id),
                }
              : r,
          ),
        })),

      linkPhotoToReport: (photoId, reportId) =>
        patchActive(set, (p) => ({
          ...p,
          photos: (p.photos ?? []).map((ph) =>
            ph.id === photoId ? { ...ph, relatedReportId: reportId } : ph,
          ),
          reports: p.reports.map((r) =>
            r.id === reportId
              ? {
                  ...r,
                  photoIds: r.photoIds?.includes(photoId)
                    ? r.photoIds
                    : [...(r.photoIds ?? []), photoId],
                }
              : r,
          ),
        })),

      upsertContact: (c) =>
        patchActive(set, (p) => {
          const id = c.id ?? uid("ct");
          const row: ProjectContact = {
            id,
            name: c.name.trim(),
            role: c.role.trim(),
            org: c.org.trim(),
            phone: c.phone?.trim() || undefined,
            email: c.email?.trim() || undefined,
            lane: c.lane,
          };
          const exists = p.contacts.some((x) => x.id === id);
          return {
            ...p,
            contacts: exists
              ? p.contacts.map((x) => (x.id === id ? row : x))
              : [row, ...p.contacts],
          };
        }),

      removeContact: (id) =>
        patchActive(set, (p) => ({
          ...p,
          contacts: p.contacts.filter((x) => x.id !== id),
        })),

      upsertInspection: (c) =>
        patchActive(set, (p) => {
          const id = c.id ?? uid("insp");
          const row: Inspection = {
            id,
            typeLabel: c.typeLabel.trim(),
            scheduledDate: c.scheduledDate,
            timeWindow: c.timeWindow.trim(),
            buildingArea: c.buildingArea.trim(),
            status: c.status,
            requestedBy: c.requestedBy.trim(),
            notes: c.notes.trim(),
            authorityOffice: c.authorityOffice.trim(),
            createdAt: c.createdAt ?? new Date().toISOString(),
            relatedReportId: c.relatedReportId,
          };
          const exists = p.inspections.some((x) => x.id === id);
          return {
            ...p,
            inspections: exists
              ? p.inspections.map((x) => (x.id === id ? row : x))
              : [row, ...p.inspections],
          };
        }),

      removeInspection: (id) =>
        patchActive(set, (p) => ({
          ...p,
          inspections: p.inspections.filter((x) => x.id !== id),
        })),

      upsertMaterial: (c) =>
        patchActive(set, (p) => {
          const id = c.id ?? uid("mat");
          const row: MaterialLine = {
            id,
            name: c.name.trim(),
            qty: c.qty,
            unit: c.unit.trim(),
            status: c.status,
            note: c.note?.trim() || undefined,
            division: c.division?.trim() || undefined,
          };
          const exists = p.materials.some((x) => x.id === id);
          return {
            ...p,
            materials: exists
              ? p.materials.map((x) => (x.id === id ? row : x))
              : [row, ...p.materials],
          };
        }),

      removeMaterial: (id) =>
        patchActive(set, (p) => ({
          ...p,
          materials: p.materials.filter((x) => x.id !== id),
        })),

      upsertSchedule: (c) =>
        patchActive(set, (p) => {
          const id = c.id ?? uid("sch");
          const row: ScheduleItem = {
            id,
            name: c.name.trim(),
            start: c.start,
            end: c.end,
            status: c.status,
            owner: c.owner.trim(),
            pct: c.pct,
          };
          const exists = p.schedule.some((x) => x.id === id);
          return {
            ...p,
            schedule: exists
              ? p.schedule.map((x) => (x.id === id ? row : x))
              : [row, ...p.schedule],
          };
        }),

      removeSchedule: (id) =>
        patchActive(set, (p) => ({
          ...p,
          schedule: p.schedule.filter((x) => x.id !== id),
        })),

      setSiteGeo: (site) => patchActive(set, (p) => ({ ...p, site })),
      setSitePin: (lat, lon, label) =>
        patchActive(set, (p) => ({
          ...p,
          site: {
            ...p.site,
            pin: {
              lat,
              lon,
              label: label ?? p.site.pin?.label ?? "Pin",
            },
          },
        })),
      clearSitePin: () =>
        patchActive(set, (p) => ({
          ...p,
          site: { ...p.site, pin: undefined },
        })),
      setBoundaryRing: (ring) =>
        patchActive(set, (p) => ({
          ...p,
          site: { ...p.site, boundaryRing: ring },
        })),
      pushBoundaryVertex: (lon, lat) =>
        patchActive(set, (p) => ({
          ...p,
          site: {
            ...p.site,
            boundaryRing: [...(p.site.boundaryRing ?? []), [lon, lat]],
          },
        })),
      clearBoundary: () =>
        patchActive(set, (p) => ({
          ...p,
          site: { ...p.site, boundaryRing: [] },
        })),
    }),
    {
      name: "lpin-mobile-jobsite-v4",
      partialize: (s) => ({
        projects: s.projects,
        activeId: s.activeId,
        role: s.role,
      }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<JobsiteState>;
        let projects = p.projects?.length ? p.projects : current.projects;
        if (!p.projects && (p as { project?: JobsiteProject }).project) {
          const one = (p as { project: JobsiteProject }).project;
          projects = [one];
        }
        projects = projects.map(normalizeProject);
        const activeId =
          p.activeId && projects.some((x) => x.id === p.activeId)
            ? p.activeId
            : projects[0]!.id;
        const project =
          projects.find((x) => x.id === activeId) ?? projects[0]!;
        return {
          ...current,
          projects,
          activeId,
          project,
          role: p.role ?? current.role,
          tab: "board",
          setupSection: "identity",
          logLane: "all",
          logDivision: "ALL",
        };
      },
    },
  ),
);
