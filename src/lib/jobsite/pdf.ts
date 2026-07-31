/**
 * Structured print → Save as PDF documents for LPIN Suite Jobsite.
 * Browser print dialog; no proprietary PDF service.
 */

import { PUBLIC_FOOTER } from "@/lib/integrity";
import {
  categoryLabel,
  evaluateReadiness,
  formatDateLabel,
  formatWhen,
  inspectionStatusLabel,
  priorityTitle,
  statusLabel,
  urgencyLabel,
} from "./domain";
import {
  contactRoleLabel,
  divisionLabel,
  scheduleStatusLabel,
} from "./divisions";
import { buildGanttBars, computeGanttWindow } from "./gantt";
import type {
  FieldReport,
  Jobsite,
  ProjectContact,
  ScheduleTask,
} from "./types";
import { openPrintPacket } from "./pack";

function esc(s: string): string {
  const map: Record<string, string> = {
    "&": "&" + "amp;",
    "<": "&" + "lt;",
    ">": "&" + "gt;",
    '"': "&" + "quot;",
    "'": "&" + "#39;",
  };
  return s.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}

const SHELL_CSS = `
  * { box-sizing: border-box; }
  body { font-family: "Segoe UI", system-ui, -apple-system, sans-serif; color: #0f1720; margin: 0; padding: 18mm 16mm; line-height: 1.45; font-size: 11.5px; }
  h1 { font-size: 20px; margin: 0 0 4px; letter-spacing: -0.02em; }
  h2 { font-size: 13px; margin: 18px 0 8px; padding-bottom: 4px; border-bottom: 2px solid #0f1720; text-transform: uppercase; letter-spacing: 0.06em; }
  h3 { font-size: 12px; margin: 0 0 4px; }
  .meta { color: #445; font-size: 11px; margin: 0 0 12px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 12px 0; }
  .kpi { border: 1px solid #c9d2dc; border-radius: 8px; padding: 8px 10px; background: #f6f8fa; }
  .kpi b { display: block; font-size: 16px; }
  .kpi span { color: #556; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; }
  .banner { padding: 10px 12px; border-radius: 8px; margin: 10px 0 14px; font-weight: 600; font-size: 12px; }
  .ok { background: #e6f6ee; border: 1px solid #8dcfb0; color: #0d5c3a; }
  .hold { background: #fdeaea; border: 1px solid #e0a0a0; color: #8a1f1f; }
  .card { border: 1px solid #c9d2dc; border-radius: 10px; padding: 12px; margin: 0 0 10px; page-break-inside: avoid; }
  .pill { display: inline-block; border-radius: 999px; padding: 2px 8px; font-size: 10px; font-weight: 600; margin-right: 4px; background: #eef2f6; border: 1px solid #c9d2dc; }
  .p0 { background: #fdeaea; border-color: #e0a0a0; color: #8a1f1f; }
  .p1 { background: #fff4df; border-color: #e8c36a; color: #7a5a10; }
  table { width: 100%; border-collapse: collapse; font-size: 11px; }
  th, td { text-align: left; padding: 6px 8px; border-bottom: 1px solid #d8dee6; vertical-align: top; }
  th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.05em; color: #556; background: #f3f6f9; }
  .gantt { border: 1px solid #c9d2dc; border-radius: 10px; overflow: hidden; margin-top: 8px; }
  .gantt-row { display: grid; grid-template-columns: 150px 1fr; border-bottom: 1px solid #e6ebf0; min-height: 28px; }
  .gantt-label { padding: 6px 8px; font-size: 10px; background: #f8fafc; border-right: 1px solid #e6ebf0; }
  .gantt-track { position: relative; height: 28px; background: repeating-linear-gradient(90deg, #f8fafc, #f8fafc 24px, #eef2f6 24px, #eef2f6 25px); }
  .gantt-bar { position: absolute; top: 6px; height: 16px; border-radius: 4px; color: #0f1720; font-size: 9px; font-weight: 600; padding: 0 6px; line-height: 16px; white-space: nowrap; overflow: hidden; }
  .foot { margin-top: 22px; padding-top: 10px; border-top: 1px solid #c9d2dc; font-size: 9.5px; color: #667; }
  .photos img { max-width: 140px; max-height: 100px; border-radius: 6px; border: 1px solid #c9d2dc; margin: 4px 8px 4px 0; }
  @media print { body { padding: 12mm; } .card, .gantt-row { break-inside: avoid; } }
`;

function doc(title: string, body: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>${esc(title)}</title><style>${SHELL_CSS}</style></head><body>${body}<div class="foot">Team jobsite board — not a city login or legal system of record. Not legal advice. LPIN Suite Jobsite · United States. ${esc(PUBLIC_FOOTER.short)}</div></body></html>`;
}

function header(jobsite: Jobsite, docTitle: string): string {
  return `
    <h1>${esc(docTitle)}</h1>
    <p class="meta">
      <strong>${esc(jobsite.name)}</strong><br/>
      ${esc(jobsite.location)}${jobsite.cityState ? ` · ${esc(jobsite.cityState)}` : ""} · United States<br/>
      Permit: ${esc(jobsite.permitNumber)} · Building dept (team copy): ${esc(jobsite.permittingOffice)}
      ${jobsite.captainName ? `<br/>Lead: ${esc(jobsite.captainName)}` : ""}
      <br/>Printed: ${esc(new Date().toLocaleString())}
    </p>`;
}

export function buildReportPdfHtml(jobsite: Jobsite, report: FieldReport): string {
  const photos = (report.photos ?? [])
    .map(
      (p) =>
        `<img src="${p.dataUrl}" alt="${esc(p.caption || "Field photo")}"/>`,
    )
    .join("");
  const body = `
    ${header(jobsite, "Field note / report")}
    <div class="card">
      <span class="pill ${report.priority === "P0" ? "p0" : report.priority === "P1" ? "p1" : ""}">${esc(report.priority)} · ${esc(priorityTitle(report.priority))}</span>
      <span class="pill">${esc(statusLabel(report.status))}</span>
      <span class="pill">${esc(categoryLabel(report.category))}</span>
      ${report.sendToAuthority ? `<span class="pill">Wired to department lane</span>` : ""}
      <h3 style="margin-top:10px">${esc(report.title)}</h3>
      <p class="meta">${esc(report.authorName)} · ${esc(urgencyLabel(report.urgency))} · ${esc(formatWhen(report.createdAt))}</p>
      <p style="white-space:pre-wrap;font-size:12px">${esc(report.body)}</p>
      ${photos ? `<div class="photos" style="margin-top:10px">${photos}</div>` : ""}
    </div>
    <p class="meta">Use this page as a field note for the file, the office, or the trade. Status remains owned by a person on the live board.</p>
  `;
  return doc(`Field note — ${report.title}`, body);
}

export function buildBoardPdfHtml(jobsite: Jobsite): string {
  const ready = evaluateReadiness(jobsite);
  const open = jobsite.reports.filter((r) => r.status !== "resolved");
  const hot = open.filter((r) => r.priority === "P0" || r.priority === "P1");
  const reportCards = (hot.length ? hot : open.slice(0, 12))
    .map(
      (r) => `
      <div class="card">
        <span class="pill ${r.priority === "P0" ? "p0" : r.priority === "P1" ? "p1" : ""}">${esc(r.priority)}</span>
        <span class="pill">${esc(statusLabel(r.status))}</span>
        <h3 style="margin-top:8px">${esc(r.title)}</h3>
        <p class="meta">${esc(r.authorName)} · ${esc(formatWhen(r.createdAt))}${r.sendToAuthority ? " · wired" : ""}${(r.photos?.length ?? 0) ? ` · ${r.photos!.length} photo(s)` : ""}</p>
        <p style="white-space:pre-wrap">${esc(r.body)}</p>
      </div>`,
    )
    .join("");

  const inspRows = jobsite.inspections
    .map(
      (i) => `<tr>
      <td>${esc(i.typeLabel)}</td>
      <td>${esc(inspectionStatusLabel(i.status))}</td>
      <td>${esc(formatDateLabel(i.scheduledDate))}</td>
      <td>${esc(i.buildingArea)}</td>
    </tr>`,
    )
    .join("");

  const body = `
    ${header(jobsite, "Jobsite readiness board")}
    <div class="banner ${ready.allClear ? "ok" : "hold"}">
      ${ready.allClear ? "ALL CLEAR — no open stop-now; no failed inspections." : `HOLD — ${esc(ready.blockers.join("; "))}`}
    </div>
    <div class="kpis">
      <div class="kpi"><b>${open.length}</b><span>Open reports</span></div>
      <div class="kpi"><b>${hot.filter((r) => r.priority === "P0").length}</b><span>Stop-now (P0)</span></div>
      <div class="kpi"><b>${jobsite.messages.length}</b><span>Messages</span></div>
      <div class="kpi"><b>${jobsite.inspections.length}</b><span>Inspections</span></div>
    </div>
    <h2>Priority stack</h2>
    ${reportCards || `<p class="meta">No open reports.</p>`}
    <h2>Inspections</h2>
    <table>
      <thead><tr><th>Type</th><th>Status</th><th>Date</th><th>Area</th></tr></thead>
      <tbody>${inspRows || `<tr><td colspan="4">None</td></tr>`}</tbody>
    </table>
  `;
  return doc(`Board — ${jobsite.name}`, body);
}

export function buildSchedulePdfHtml(jobsite: Jobsite): string {
  const win = computeGanttWindow(jobsite.schedule, jobsite.inspections);
  const bars = buildGanttBars(jobsite);
  const ganttRows = bars
    .map((b) => {
      const left = Math.round(b.left * 1000) / 10;
      const width = Math.max(2, Math.round(b.width * 1000) / 10);
      return `<div class="gantt-row">
        <div class="gantt-label"><strong>${esc(b.label)}</strong><br/>${esc(b.sublabel)}${b.contactName ? `<br/>${esc(b.contactName)}` : ""}</div>
        <div class="gantt-track">
          <div class="gantt-bar" style="left:${left}%;width:${width}%;background:${b.color}">${esc(b.startDate)} → ${esc(b.endDate)}</div>
        </div>
      </div>`;
    })
    .join("");

  const taskRows = (jobsite.schedule ?? [])
    .map(
      (t) => `<tr>
      <td>${esc(t.title)}</td>
      <td>${esc(divisionLabel(t.division))}</td>
      <td>${esc(scheduleStatusLabel(t.status))}</td>
      <td>${esc(t.startDate)}</td>
      <td>${esc(t.endDate)}</td>
      <td>${t.progress}%</td>
    </tr>`,
    )
    .join("");

  const body = `
    ${header(jobsite, "Schedule & Gantt")}
    <p class="meta">Window: ${esc(win.start)} → ${esc(win.end)} · Bars include work packages and inspections.</p>
    <h2>Gantt</h2>
    <div class="gantt">${ganttRows || `<p class="meta" style="padding:10px">No schedule bars yet.</p>`}</div>
    <h2>Work packages</h2>
    <table>
      <thead><tr><th>Title</th><th>Division</th><th>Status</th><th>Start</th><th>End</th><th>%</th></tr></thead>
      <tbody>${taskRows || `<tr><td colspan="6">None</td></tr>`}</tbody>
    </table>
  `;
  return doc(`Schedule — ${jobsite.name}`, body);
}

export function buildContactsPdfHtml(jobsite: Jobsite): string {
  const contacts = [...(jobsite.contacts ?? [])].sort((a, b) =>
    a.division.localeCompare(b.division) || a.company.localeCompare(b.company),
  );
  const rows = contacts
    .map(
      (c) => `<tr>
      <td>${esc(divisionLabel(c.division))}</td>
      <td><strong>${esc(c.company)}</strong><br/>${esc(c.contactName)}<br/><span class="pill">${esc(contactRoleLabel(c.role))}</span></td>
      <td>${c.phone ? esc(c.phone) + "<br/>" : ""}${c.email ? esc(c.email) : "—"}</td>
      <td>${esc(c.scope || "—")}</td>
      <td>${esc(c.inventoryNotes || "—")}</td>
      <td>${esc(c.conditionNotes || "—")}</td>
      <td>${esc(c.leadTime || "—")}</td>
      <td>${c.active ? "Active" : "Inactive"}</td>
    </tr>`,
    )
    .join("");

  const body = `
    ${header(jobsite, "Project contacts & vendors")}
    <p class="meta">Division directory for inventory, schedule ownership, and site conditions. Shared on this board for the whole team.</p>
    <table>
      <thead>
        <tr>
          <th>Division</th><th>Company / contact</th><th>Phone / email</th>
          <th>Scope</th><th>Inventory</th><th>Conditions</th><th>Lead time</th><th>Status</th>
        </tr>
      </thead>
      <tbody>${rows || `<tr><td colspan="8">No contacts yet.</td></tr>`}</tbody>
    </table>
  `;
  return doc(`Contacts — ${jobsite.name}`, body);
}

export function buildFullProjectPdfHtml(jobsite: Jobsite): string {
  // Compose key sections into one packet
  const board = buildBoardPdfHtml(jobsite);
  // Extract body inner from board is messy — rebuild compact full packet
  const ready = evaluateReadiness(jobsite);
  const scheduleSection = buildSchedulePdfHtml(jobsite);
  const contactsSection = buildContactsPdfHtml(jobsite);
  // Simpler: print board then note user can print schedule/contacts separately
  // Better full packet:
  const body = `
    ${header(jobsite, "Full project packet")}
    <div class="banner ${ready.allClear ? "ok" : "hold"}">
      ${ready.allClear ? "ALL CLEAR" : `HOLD — ${esc(ready.blockers.join("; "))}`}
    </div>
    <div class="kpis">
      <div class="kpi"><b>${jobsite.reports.filter((r) => r.status !== "resolved").length}</b><span>Open reports</span></div>
      <div class="kpi"><b>${jobsite.schedule?.length ?? 0}</b><span>Schedule items</span></div>
      <div class="kpi"><b>${jobsite.contacts?.length ?? 0}</b><span>Contacts</span></div>
      <div class="kpi"><b>${jobsite.inspections.length}</b><span>Inspections</span></div>
    </div>
    <p class="meta">This packet combines readiness, schedule snapshot, and vendor directory for handoff.</p>
  `;
  // Strip outer shells from schedule/contacts and append inner content is hard.
  // Use openPrintPacket with a merged HTML that reuses builders' inner sections via regenerate:
  void board;
  void scheduleSection;
  void contactsSection;
  const merged = `
    ${body}
    <h2>Priority reports</h2>
    ${jobsite.reports
      .filter((r) => r.status !== "resolved" && (r.priority === "P0" || r.priority === "P1"))
      .map(
        (r) => `<div class="card"><span class="pill ${r.priority === "P0" ? "p0" : "p1"}">${esc(r.priority)}</span> <strong>${esc(r.title)}</strong><p>${esc(r.body)}</p></div>`,
      )
      .join("") || "<p class=meta>None</p>"}
    <h2>Schedule</h2>
    <table><thead><tr><th>Title</th><th>Division</th><th>Status</th><th>Start</th><th>End</th></tr></thead>
    <tbody>${(jobsite.schedule ?? [])
      .map(
        (t) =>
          `<tr><td>${esc(t.title)}</td><td>${esc(divisionLabel(t.division))}</td><td>${esc(scheduleStatusLabel(t.status))}</td><td>${esc(t.startDate)}</td><td>${esc(t.endDate)}</td></tr>`,
      )
      .join("") || "<tr><td colspan=5>None</td></tr>"}</tbody></table>
    <h2>Contacts</h2>
    <table><thead><tr><th>Division</th><th>Company</th><th>Contact</th><th>Inventory</th><th>Conditions</th></tr></thead>
    <tbody>${(jobsite.contacts ?? [])
      .map(
        (c) =>
          `<tr><td>${esc(divisionLabel(c.division))}</td><td>${esc(c.company)}</td><td>${esc(c.contactName)}</td><td>${esc(c.inventoryNotes || "—")}</td><td>${esc(c.conditionNotes || "—")}</td></tr>`,
      )
      .join("") || "<tr><td colspan=5>None</td></tr>"}</tbody></table>
  `;
  return doc(`Project packet — ${jobsite.name}`, merged);
}

export function printHtml(html: string, title: string): void {
  openPrintPacket(html, title);
}

export function printReport(jobsite: Jobsite, report: FieldReport): void {
  printHtml(buildReportPdfHtml(jobsite, report), `Field note — ${report.title}`);
}

export function printBoard(jobsite: Jobsite): void {
  printHtml(buildBoardPdfHtml(jobsite), `Board — ${jobsite.name}`);
}

export function printSchedule(jobsite: Jobsite): void {
  printHtml(buildSchedulePdfHtml(jobsite), `Schedule — ${jobsite.name}`);
}

export function printContacts(jobsite: Jobsite): void {
  printHtml(buildContactsPdfHtml(jobsite), `Contacts — ${jobsite.name}`);
}

export function printFullProject(jobsite: Jobsite): void {
  printHtml(buildFullProjectPdfHtml(jobsite), `Project packet — ${jobsite.name}`);
}

// silence unused type imports if tree-shaken oddly
export type _PdfTypes = ProjectContact | ScheduleTask;
