/**
 * Portable LPIN Suite Jobsite project packs — open JSON anyone can inspect, backup, or hand off.
 */

import { sanitizeForPublicSurface } from "@/lib/integrity";
import { newId } from "./domain";
import type { JobsitePack, Jobsite } from "./types";

export const PACK_DISCLAIMER =
  "LPIN Suite Jobsite project pack (United States). Team board only — not a city/county system of record. Not legal advice. A person owns every status.";

export function buildPack(jobsite: Jobsite): JobsitePack {
  return {
    format: "lpin-jobsite-pack",
    version: 1,
    exportedAt: new Date().toISOString(),
    app: "lpin-jobsite",
    productRegion: "US",
    disclaimer: PACK_DISCLAIMER,
    jobsite: {
      ...jobsite,
      country: "US",
      updatedAt: new Date().toISOString(),
    },
  };
}

export function packToJson(jobsite: Jobsite): string {
  return JSON.stringify(buildPack(jobsite), null, 2);
}

export function packFilename(jobsite: Jobsite): string {
  const slug = (jobsite.name || "jobsite")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  const day = new Date().toISOString().slice(0, 10);
  return `${slug || "lpin-jobsite"}-${day}.lpin-jobsite.json`;
}

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Parse and normalize a pack or raw jobsite JSON from another device. */
export function parsePackJson(raw: string): { ok: true; jobsite: Jobsite } | { ok: false; error: string } {
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return { ok: false, error: "File is not valid JSON." };
  }

  let jobsiteRaw: unknown = data;
  if (isObject(data) && (data.format === "lpin-jobsite-pack" || data.format === "fieldpulse-pack") && isObject(data.jobsite)) {
    jobsiteRaw = data.jobsite;
  }

  if (!isObject(jobsiteRaw)) {
    return { ok: false, error: "Missing jobsite object in file." };
  }

  const name = String(jobsiteRaw.name ?? "").trim();
  if (!name) return { ok: false, error: "Project name is required in the file." };

  const reports = Array.isArray(jobsiteRaw.reports) ? jobsiteRaw.reports : [];
  const messages = Array.isArray(jobsiteRaw.messages) ? jobsiteRaw.messages : [];
  const inspections = Array.isArray(jobsiteRaw.inspections)
    ? jobsiteRaw.inspections
    : [];
  const contacts = Array.isArray(jobsiteRaw.contacts) ? jobsiteRaw.contacts : [];
  const schedule = Array.isArray(jobsiteRaw.schedule) ? jobsiteRaw.schedule : [];
  const materials = Array.isArray(jobsiteRaw.materials) ? jobsiteRaw.materials : [];

  const jobsite: Jobsite = {
    id: String(jobsiteRaw.id || newId("js")),
    name,
    location: String(jobsiteRaw.location ?? ""),
    cityState: jobsiteRaw.cityState
      ? String(jobsiteRaw.cityState)
      : undefined,
    permitNumber: String(jobsiteRaw.permitNumber ?? "TBD"),
    permittingOffice: String(
      jobsiteRaw.permittingOffice ?? "City / County Building Department",
    ),
    country: "US",
    stateCode: jobsiteRaw.stateCode
      ? String(jobsiteRaw.stateCode).toUpperCase().slice(0, 2)
      : undefined,
    isDemo: false,
    captainName: jobsiteRaw.captainName
      ? String(jobsiteRaw.captainName)
      : undefined,
    notes: jobsiteRaw.notes ? String(jobsiteRaw.notes) : undefined,
    updatedAt: new Date().toISOString(),
    reports: reports as Jobsite["reports"],
    messages: messages as Jobsite["messages"],
    inspections: inspections as Jobsite["inspections"],
    contacts: contacts as Jobsite["contacts"],
    schedule: schedule as Jobsite["schedule"],
    materials: materials as Jobsite["materials"],
    dailyLogs: Array.isArray(jobsiteRaw.dailyLogs)
      ? (jobsiteRaw.dailyLogs as Jobsite["dailyLogs"])
      : [],
    punchList: Array.isArray(jobsiteRaw.punchList)
      ? (jobsiteRaw.punchList as Jobsite["punchList"])
      : [],
    changeOrders: Array.isArray(jobsiteRaw.changeOrders)
      ? (jobsiteRaw.changeOrders as Jobsite["changeOrders"])
      : [],
    industry: jobsiteRaw.industry as Jobsite["industry"],
    projectStartDate: jobsiteRaw.projectStartDate
      ? String(jobsiteRaw.projectStartDate)
      : undefined,
    materialsBudget:
      typeof jobsiteRaw.materialsBudget === "number"
        ? jobsiteRaw.materialsBudget
        : undefined,
  };

  return { ok: true, jobsite };
}

export function downloadPack(jobsite: Jobsite): void {
  const json = packToJson(jobsite);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = packFilename(jobsite);
  a.click();
  URL.revokeObjectURL(url);
}

/** Open a print window with a readiness packet (user can Save as PDF). */
export function openPrintPacket(html: string, title: string): void {
  const w = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
  if (!w) {
    throw new Error("Pop-up blocked — allow pop-ups to print or save PDF.");
  }
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.document.title = title;
  // Give styles a tick to settle
  setTimeout(() => {
    try {
      w.focus();
      w.print();
    } catch {
      /* user can print manually */
    }
  }, 250);
}

export function buildMailtoHref(jobsite: Jobsite, body: string): string {
  const subject = encodeURIComponent(
    `LPIN Suite Jobsite readiness — ${jobsite.name} · ${jobsite.permitNumber}`,
  );
  const text = encodeURIComponent(
    sanitizeForPublicSurface(
      [
        body,
        "",
        "—",
        PACK_DISCLAIMER,
        "Sent from LPIN Suite Jobsite (team board on this device).",
      ].join("\n"),
    ),
  );
  // Cap body so mailto stays usable on mobile
  const capped = text.length > 1800 ? `${text.slice(0, 1800)}%0A%0A%5Btruncated — attach export pack for full board%5D` : text;
  return `mailto:?subject=${subject}&body=${capped}`;
}
