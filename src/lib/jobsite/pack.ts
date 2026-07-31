/**
 * Portable LPINv3 Jobsite packs — open JSON for backup / handoff.
 */
import type { JobsiteProject, PhotoNote } from "./types";
import { uid } from "@/lib/utils";

export const PACK_DISCLAIMER =
  "LPINv3 Jobsite project pack (United States). Team board only — not a city/county system of record. Not legal advice. A person owns every status.";

export interface JobsitePack {
  format: "lpin-jobsite-pack";
  version: 1;
  exportedAt: string;
  app: "lpin-jobsite-mobile";
  productRegion: "US";
  disclaimer: string;
  jobsite: JobsiteProject;
}

export function buildPack(project: JobsiteProject): JobsitePack {
  return {
    format: "lpin-jobsite-pack",
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "lpin-jobsite-mobile",
    productRegion: "US",
    disclaimer: PACK_DISCLAIMER,
    jobsite: {
      ...project,
      photos: project.photos ?? [],
      updatedAt: new Date().toISOString(),
    },
  };
}

export function packToJson(project: JobsiteProject): string {
  return JSON.stringify(buildPack(project), null, 2);
}

export function packFilename(project: JobsiteProject): string {
  const slug = (project.name || "jobsite")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const day = new Date().toISOString().slice(0, 10);
  return `${slug || "lpin-jobsite"}-${day}.lpin-jobsite.json`;
}

export function downloadPack(project: JobsiteProject): void {
  const blob = new Blob([packToJson(project)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = packFilename(project);
  a.click();
  URL.revokeObjectURL(url);
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function asArray<T>(v: unknown): T[] {
  return Array.isArray(v) ? (v as T[]) : [];
}

/** Parse pack or raw jobsite JSON from another device. */
export function parsePackJson(
  raw: string,
): { ok: true; project: JobsiteProject } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }

  let jobsiteRaw: unknown = data;
  if (
    isObject(data) &&
    (data.format === "lpin-jobsite-pack" ||
      data.format === "fieldpulse-pack") &&
    isObject(data.jobsite)
  ) {
    jobsiteRaw = data.jobsite;
  }

  if (!isObject(jobsiteRaw)) {
    return { ok: false, error: "Missing jobsite object in file." };
  }

  const name = String(jobsiteRaw.name ?? "").trim();
  if (!name) return { ok: false, error: "Project name is required in the file." };

  const id = String(jobsiteRaw.id || uid("js"));
  const reports = asArray(jobsiteRaw.reports);
  const messages = asArray(jobsiteRaw.messages);
  const inspections = asArray(jobsiteRaw.inspections);
  const materials = asArray(jobsiteRaw.materials);
  const schedule = asArray(jobsiteRaw.schedule);
  const contacts = asArray(jobsiteRaw.contacts);
  const photos = asArray<PhotoNote>(jobsiteRaw.photos);

  let fieldComms = jobsiteRaw.fieldComms;
  if (!isObject(fieldComms) || !Array.isArray(fieldComms.messages)) {
    fieldComms = {
      version: 1,
      projectId: id,
      messages: [],
      generatedAt: new Date().toISOString(),
    };
  }

  let site = jobsiteRaw.site;
  if (!isObject(site)) {
    const siteGeo = jobsiteRaw.siteGeo;
    if (isObject(siteGeo) && isObject(siteGeo.pin)) {
      const pin = siteGeo.pin as Record<string, unknown>;
      site = {
        version: 1,
        pin: {
          lat: Number(pin.lat),
          lon: Number(pin.lon ?? pin.lng),
          label: pin.label ? String(pin.label) : undefined,
        },
      };
    } else {
      site = { version: 1 };
    }
  }

  const project: JobsiteProject = {
    id,
    name,
    location: String(jobsiteRaw.location ?? "United States"),
    cityState: jobsiteRaw.cityState
      ? String(jobsiteRaw.cityState)
      : undefined,
    permitNumber: String(jobsiteRaw.permitNumber ?? "TBD"),
    permittingOffice: String(
      jobsiteRaw.permittingOffice ?? "City / County Building Department",
    ),
    captainName: String(jobsiteRaw.captainName ?? ""),
    isDemo: Boolean(jobsiteRaw.isDemo),
    industry: String(jobsiteRaw.industry ?? "commercial"),
    notes: String(jobsiteRaw.notes ?? ""),
    stateCode: jobsiteRaw.stateCode
      ? String(jobsiteRaw.stateCode).toUpperCase().slice(0, 2)
      : undefined,
    projectStartDate: jobsiteRaw.projectStartDate
      ? String(jobsiteRaw.projectStartDate)
      : undefined,
    materialsBudget:
      typeof jobsiteRaw.materialsBudget === "number"
        ? jobsiteRaw.materialsBudget
        : undefined,
    country: "US",
    reports: reports as JobsiteProject["reports"],
    messages: messages as JobsiteProject["messages"],
    fieldComms: fieldComms as JobsiteProject["fieldComms"],
    inspections: inspections as JobsiteProject["inspections"],
    materials: materials as JobsiteProject["materials"],
    schedule: schedule as JobsiteProject["schedule"],
    contacts: contacts as JobsiteProject["contacts"],
    photos,
    site: site as JobsiteProject["site"],
    updatedAt: String(jobsiteRaw.updatedAt ?? new Date().toISOString()),
  };

  return { ok: true, project };
}

export function buildDeskSummary(project: JobsiteProject): string {
  const open = project.reports.filter((r) => r.status !== "resolved").length;
  const p0 = project.reports.filter(
    (r) => r.priority === "P0" && r.status !== "resolved",
  ).length;
  const photoCount = project.photos?.length ?? 0;
  const lines = [
    `LPINv3 Jobsite desk summary — ${project.name}`,
    `Region: United States`,
    `State: ${project.stateCode ?? "not set"}`,
    `Industry: ${project.industry || "not set"}`,
    `Location: ${project.location}${project.cityState ? ` (${project.cityState})` : ""}`,
    `Permit: ${project.permitNumber}`,
    `Building department: ${project.permittingOffice}`,
    project.captainName ? `Superintendent: ${project.captainName}` : null,
    "",
    p0 > 0
      ? `Readiness: HOLD — ${p0} open P0`
      : "Readiness: no open P0 (person still owns status)",
    `Open reports: ${open}`,
    `Messages (BD lane): ${project.messages.length}`,
    `Field log: ${project.fieldComms.messages.length}`,
    `Photo notes: ${photoCount}`,
    `Inspections: ${project.inspections.length}`,
    `Schedule: ${project.schedule.length}`,
    `Materials: ${project.materials.length}`,
    `Contacts: ${project.contacts.length}`,
    "",
    "## Open high-priority reports",
  ].filter((l): l is string => l !== null);

  const hot = project.reports.filter(
    (r) =>
      r.status !== "resolved" && (r.priority === "P0" || r.priority === "P1"),
  );
  if (!hot.length) lines.push("- None");
  else {
    for (const r of hot) {
      lines.push(
        `- [${r.priority}] ${r.title} · ${r.status} · ${r.authorRole}${
          r.sendToAuthority ? " · wired BD" : ""
        }${r.photoIds?.length ? ` · ${r.photoIds.length} photo(s)` : ""}`,
      );
    }
  }
  lines.push("", PACK_DISCLAIMER);
  return lines.join("\n");
}
