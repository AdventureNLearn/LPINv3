import { PUBLIC_FOOTER, sanitizeForPublicSurface } from "@/lib/integrity";
import type {
  ActivityItem,
  FieldReport,
  Inspection,
  InspectionStatus,
  Jobsite,
  MessageDirection,
  Priority,
  ProjectIdentity,
  ReadinessStatus,
  ReportCategory,
  ReportStatus,
  Role,
  Urgency,
  VisibilityGap,
} from "./types";

const PRIORITY_RANK: Record<Priority, number> = {
  P0: 0,
  P1: 1,
  P2: 2,
  P3: 3,
};

const STATUS_RANK: Record<ReportStatus, number> = {
  open: 0,
  seen: 1,
  resolved: 2,
};

export function sortReports(reports: FieldReport[]): FieldReport[] {
  return [...reports].sort((a, b) => {
    const pr = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (pr !== 0) return pr;
    const sr = STATUS_RANK[a.status] - STATUS_RANK[b.status];
    if (sr !== 0) return sr;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

export function computeVisibilityGap(reports: FieldReport[]): VisibilityGap {
  const unseenCritical = reports.filter(
    (r) => r.priority === "P0" && r.status === "open",
  ).length;
  const unseenImportant = reports.filter(
    (r) => r.priority === "P1" && r.status === "open",
  ).length;
  const total = unseenCritical + unseenImportant;
  const meter = Math.min(100, unseenCritical * 35 + unseenImportant * 15);
  return { unseenCritical, unseenImportant, total, meter };
}

export function evaluateReadiness(jobsite: Jobsite): ReadinessStatus {
  const openP0 = jobsite.reports.filter(
    (r) => r.priority === "P0" && r.status !== "resolved",
  );
  const openP1 = jobsite.reports.filter(
    (r) => r.priority === "P1" && r.status === "open",
  );
  const failedInspections = jobsite.inspections.filter(
    (i) => i.status === "failed",
  );
  const unwiredP0 = openP0.filter(
    (r) => !r.sendToAuthority && !r.relatedMessageId,
  );

  const blockers: string[] = [];
  if (openP0.length) {
    blockers.push(
      `${openP0.length} stop-now (P0) report${openP0.length === 1 ? "" : "s"} still open`,
    );
  }
  if (failedInspections.length) {
    blockers.push(
      `${failedInspections.length} inspection${failedInspections.length === 1 ? "" : "s"} did not pass`,
    );
  }
  if (unwiredP0.length) {
    blockers.push(
      `${unwiredP0.length} stop-now report${unwiredP0.length === 1 ? "" : "s"} not wired to the building department`,
    );
  }

  return {
    allClear: blockers.length === 0,
    openP0Ids: openP0.map((r) => r.id),
    openP1Ids: openP1.map((r) => r.id),
    failedInspectionIds: failedInspections.map((i) => i.id),
    unwiredP0Ids: unwiredP0.map((r) => r.id),
    blockers,
  };
}

export function createEmptyJobsite(identity?: Partial<ProjectIdentity>): Jobsite {
  const now = new Date().toISOString();
  return {
    id: newId("js"),
    name: identity?.name?.trim() || "My jobsite",
    location: identity?.location?.trim() || "United States",
    cityState: identity?.cityState?.trim() || undefined,
    permitNumber: identity?.permitNumber?.trim() || "TBD",
    permittingOffice:
      identity?.permittingOffice?.trim() || "City / County Building Department",
    country: "US",
    stateCode: identity?.stateCode?.trim().toUpperCase().slice(0, 2) || undefined,
    isDemo: false,
    captainName: identity?.captainName?.trim() || undefined,
    notes: identity?.notes?.trim() || undefined,
    industry: identity?.industry,
    projectStartDate: identity?.projectStartDate,
    materialsBudget: identity?.materialsBudget,
    updatedAt: now,
    reports: [],
    messages: [],
    inspections: [],
    contacts: [],
    schedule: [],
    materials: [],
    dailyLogs: [],
    punchList: [],
    changeOrders: [],
  };
}

export function applyProjectIdentity(
  jobsite: Jobsite,
  identity: ProjectIdentity,
): Jobsite {
  return {
    ...jobsite,
    name: identity.name.trim() || jobsite.name,
    location: identity.location.trim() || jobsite.location,
    cityState: identity.cityState?.trim() || undefined,
    permitNumber: identity.permitNumber.trim() || jobsite.permitNumber,
    permittingOffice:
      identity.permittingOffice.trim() || jobsite.permittingOffice,
    stateCode: identity.stateCode?.trim().toUpperCase().slice(0, 2) || undefined,
    captainName: identity.captainName?.trim() || undefined,
    notes: identity.notes?.trim() || undefined,
    industry: identity.industry ?? jobsite.industry,
    projectStartDate: identity.projectStartDate ?? jobsite.projectStartDate,
    materialsBudget: identity.materialsBudget ?? jobsite.materialsBudget,
    isDemo: false,
    country: "US",
    updatedAt: new Date().toISOString(),
  };
}

export function buildDeskSummary(jobsite: Jobsite): string {
  const gap = computeVisibilityGap(jobsite.reports);
  const ready = evaluateReadiness(jobsite);
  const open = jobsite.reports.filter((r) => r.status !== "resolved").length;
  const mat = jobsite.materials ?? [];
  const lines = [
    `LPIN Suite Jobsite desk summary — ${jobsite.name}`,
    `Region: United States`,
    `Industry: ${jobsite.industry ?? "not set"}`,
    `Location: ${jobsite.location}${jobsite.cityState ? ` (${jobsite.cityState})` : ""}`,
    `Permit: ${jobsite.permitNumber}`,
    `Building department (team copy): ${jobsite.permittingOffice}`,
    jobsite.captainName ? `Superintendent / lead: ${jobsite.captainName}` : null,
    "",
    ready.allClear
      ? "Readiness: ALL CLEAR (no open stop-now; no failed inspections)"
      : `Readiness: HOLD — ${ready.blockers.join("; ")}`,
    `Open reports: ${open}`,
    `Unseen stop-now (P0): ${gap.unseenCritical}`,
    `Unseen blocks-job (P1): ${gap.unseenImportant}`,
    `Messages: ${jobsite.messages.length}`,
    `Inspections: ${jobsite.inspections.length}`,
    `Schedule tasks: ${(jobsite.schedule ?? []).length}`,
    `Material lines: ${mat.length}`,
    "",
    "## Open high-priority reports",
  ].filter((l): l is string => l !== null);
  const hot = sortReports(
    jobsite.reports.filter(
      (r) =>
        r.status !== "resolved" && (r.priority === "P0" || r.priority === "P1"),
    ),
  );
  if (!hot.length) {
    lines.push("- None");
  } else {
    for (const r of hot) {
      const photoNote =
        r.photos && r.photos.length
          ? ` · ${r.photos.length} photo${r.photos.length === 1 ? "" : "s"}`
          : "";
      lines.push(
        `- [${r.priority}] ${r.title} · ${statusLabel(r.status)}${
          r.sendToAuthority ? " · wired to building department" : ""
        }${photoNote}`,
      );
    }
  }
  lines.push("");
  lines.push("## Upcoming / open inspections");
  const liveInsp = sortInspections(
    jobsite.inspections.filter(
      (i) => i.status !== "passed" && i.status !== "cancelled",
    ),
  );
  if (!liveInsp.length) {
    lines.push("- None open");
  } else {
    for (const i of liveInsp) {
      lines.push(
        `- ${i.typeLabel} · ${inspectionStatusLabel(i.status)} · ${i.scheduledDate} · ${i.buildingArea}`,
      );
    }
  }
  lines.push("");
  lines.push(
    "Note: Team board only — not a city login or legal system of record.",
  );
  lines.push("---");
  lines.push(PUBLIC_FOOTER.short);
  return sanitizeForPublicSurface(lines.filter(Boolean).join("\n"));
}

export function buildReadinessPacket(jobsite: Jobsite): string {
  const summary = buildDeskSummary(jobsite);
  const extra: string[] = [summary, "", "## All open reports"];
  const open = sortReports(
    jobsite.reports.filter((r) => r.status !== "resolved"),
  );
  if (!open.length) {
    extra.push("- None");
  } else {
    for (const r of open) {
      extra.push("");
      extra.push(`### [${r.priority}] ${r.title}`);
      extra.push(
        `${statusLabel(r.status)} · ${categoryLabel(r.category)} · ${urgencyLabel(r.urgency)}`,
      );
      extra.push(`By ${r.authorName} · ${formatWhen(r.createdAt)}`);
      extra.push(r.body);
      if (r.photos?.length) {
        extra.push(`Photos attached in board: ${r.photos.length}`);
      }
    }
  }
  extra.push("");
  extra.push("## Recent messages (last 12)");
  const msgs = [...jobsite.messages]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 12);
  if (!msgs.length) {
    extra.push("- None");
  } else {
    for (const m of msgs) {
      extra.push(
        `- ${m.subject} (${messageDirectionLabel(m.direction)}) · ${formatWhen(m.createdAt)}`,
      );
    }
  }
  return sanitizeForPublicSurface(extra.join("\n"));
}

function escapeHtml(s: string): string {
  const map: Record<string, string> = {
    "&": "&" + "amp;",
    "<": "&" + "lt;",
    ">": "&" + "gt;",
    '"': "&" + "quot;",
    "'": "&" + "#39;",
  };
  return s.replace(/[&<>"']/g, (ch) => map[ch] ?? ch);
}

export function buildPrintHtml(jobsite: Jobsite): string {
  const ready = evaluateReadiness(jobsite);
  const gap = computeVisibilityGap(jobsite.reports);
  const hot = sortReports(
    jobsite.reports.filter(
      (r) =>
        r.status !== "resolved" && (r.priority === "P0" || r.priority === "P1"),
    ),
  );
  const inspections = sortInspections(jobsite.inspections);
  const esc = escapeHtml;
  const photoBlocks = (r: FieldReport) =>
    (r.photos ?? [])
      .map((p) => {
        const cap = esc(p.caption || "Photo");
        return (
          '<figure style="display:inline-block;margin:6px 8px 6px 0;max-width:160px">' +
          `<img src="${p.dataUrl}" alt="" style="max-width:160px;max-height:120px;border:1px solid #ccc;border-radius:6px"/>` +
          `<figcaption style="font-size:10px;color:#555">${cap}</figcaption></figure>`
        );
      })
      .join("");
  const reportRows = hot.length
    ? hot
        .map((r) => {
          const wired = r.sendToAuthority ? " · wired" : "";
          return (
            '<section style="margin:12px 0;padding:12px;border:1px solid #ccc;border-radius:8px;page-break-inside:avoid">' +
            `<div style="font-weight:700;font-size:13px">[${esc(r.priority)}] ${esc(r.title)}</div>` +
            `<div style="font-size:11px;color:#444;margin:4px 0">${esc(statusLabel(r.status))} · ${esc(categoryLabel(r.category))} · ${esc(r.authorName)}${wired}</div>` +
            `<div style="font-size:12px;white-space:pre-wrap">${esc(r.body)}</div>` +
            photoBlocks(r) +
            "</section>"
          );
        })
        .join("")
    : '<p style="font-size:12px;color:#555">No open stop-now or job-blocking reports.</p>';
  const inspRows = inspections
    .map((i) => {
      return (
        "<tr>" +
        `<td style="padding:6px;border-bottom:1px solid #ddd;font-size:12px">${esc(i.typeLabel)}</td>` +
        `<td style="padding:6px;border-bottom:1px solid #ddd;font-size:12px">${esc(inspectionStatusLabel(i.status))}</td>` +
        `<td style="padding:6px;border-bottom:1px solid #ddd;font-size:12px">${esc(i.scheduledDate)}</td>` +
        `<td style="padding:6px;border-bottom:1px solid #ddd;font-size:12px">${esc(i.buildingArea)}</td>` +
        "</tr>"
      );
    })
    .join("");
  const holdBanner = ready.allClear
    ? "ALL CLEAR — no open stop-now; no failed inspections. A person still owns every status."
    : `HOLD — ${esc(ready.blockers.join("; "))}`;
  const bannerClass = ready.allClear ? "ok" : "hold";
  const cityLine = jobsite.cityState ? ` · ${esc(jobsite.cityState)}` : "";
  const captainLine = jobsite.captainName
    ? `<br/>Superintendent / lead: ${esc(jobsite.captainName)}`
    : "";
  const openCount = jobsite.reports.filter((r) => r.status !== "resolved").length;
  const inspBody =
    inspRows ||
    '<tr><td colspan="4" style="padding:8px;font-size:12px;color:#555">None</td></tr>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>LPIN Suite Jobsite readiness — ${esc(jobsite.name)}</title>
<style>
  body { font-family: system-ui, -apple-system, Segoe UI, sans-serif; color: #111; margin: 24px; line-height: 1.4; }
  h1 { font-size: 20px; margin: 0 0 4px; }
  h2 { font-size: 14px; margin: 20px 0 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; }
  .meta { font-size: 12px; color: #444; }
  .banner { padding: 10px 12px; border-radius: 8px; margin: 12px 0; font-size: 13px; font-weight: 600; }
  .ok { background: #e6f6ee; border: 1px solid #8dcfb0; color: #0d5c3a; }
  .hold { background: #fdeaea; border: 1px solid #e0a0a0; color: #8a1f1f; }
  table { width: 100%; border-collapse: collapse; }
  .foot { margin-top: 28px; font-size: 10px; color: #666; border-top: 1px solid #ddd; padding-top: 10px; }
  @media print { body { margin: 12mm; } }
</style>
</head>
<body>
  <h1>LPIN Suite Jobsite readiness packet</h1>
  <p class="meta">
    <strong>${esc(jobsite.name)}</strong><br/>
    ${esc(jobsite.location)}${cityLine} · United States<br/>
    Permit: ${esc(jobsite.permitNumber)} · Building department (team copy): ${esc(jobsite.permittingOffice)}<br/>
    Printed: ${esc(new Date().toLocaleString())}
    ${captainLine}
  </p>
  <div class="banner ${bannerClass}">${holdBanner}</div>
  <p class="meta">
    Unseen stop-now (P0): ${gap.unseenCritical} · Unseen blocks-job (P1): ${gap.unseenImportant} ·
    Open reports: ${openCount} ·
    Messages: ${jobsite.messages.length} · Inspections: ${jobsite.inspections.length}
  </p>
  <h2>Open high-priority reports</h2>
  ${reportRows}
  <h2>Inspections</h2>
  <table>
    <thead>
      <tr>
        <th align="left" style="font-size:11px;padding:6px;border-bottom:2px solid #ccc">Type</th>
        <th align="left" style="font-size:11px;padding:6px;border-bottom:2px solid #ccc">Status</th>
        <th align="left" style="font-size:11px;padding:6px;border-bottom:2px solid #ccc">Date</th>
        <th align="left" style="font-size:11px;padding:6px;border-bottom:2px solid #ccc">Area</th>
      </tr>
    </thead>
    <tbody>
      ${inspBody}
    </tbody>
  </table>
  <div class="foot">
    Team board only — not a city/county login or legal system of record. Not legal advice.
    LPIN Suite Jobsite · United States. ${esc(PUBLIC_FOOTER.short)}
  </div>
</body>
</html>`;
}

export function priorityTitle(p: Priority): string {
  switch (p) {
    case "P0":
      return "Stop now";
    case "P1":
      return "Blocks the job";
    case "P2":
      return "Needs eyes soon";
    case "P3":
      return "For information";
  }
}

export function priorityHelp(p: Priority): string {
  switch (p) {
    case "P0":
      return "Safety risk or stop-work. Always shown at the top until someone takes ownership. Blocks “all clear.”";
    case "P1":
      return "Work is blocked or will slip today if no one acts.";
    case "P2":
      return "Important, but not an immediate stop. Plan it into the next shift.";
    case "P3":
      return "Heads-up only. Does not block progress by itself.";
  }
}

export function urgencyLabel(u: Urgency): string {
  switch (u) {
    case "immediate":
      return "Right now";
    case "today":
      return "Today";
    case "this_week":
      return "This week";
    case "whenever":
      return "When you can";
  }
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "field":
      return "Jobsite crew";
    case "office":
      return "Office desk";
    case "owner":
      return "Owner / developer";
    case "authority":
      return "Building department (team copy)";
  }
}

export function roleHelp(role: Role): string {
  switch (role) {
    case "field":
      return "Superintendents, trades, and safety on site. Report problems, message the building department lane, and request inspections.";
    case "office":
      return "Project managers and operations. Mark items seen, coordinate, and talk to the building department lane.";
    case "owner":
      return "Property owner or developer. See the same priority stack so nothing is hidden.";
    case "authority":
      return "Team copy of the city/county desk — not a live government login. Record what the real office said and confirm inspection status.";
  }
}

export function statusLabel(s: ReportStatus): string {
  switch (s) {
    case "open":
      return "Needs attention";
    case "seen":
      return "Seen by desk";
    case "resolved":
      return "Closed";
  }
}

export function categoryLabel(c: ReportCategory): string {
  switch (c) {
    case "safety":
      return "Safety";
    case "permit":
      return "Permit / code";
    case "inspection":
      return "Inspection";
    case "materials":
      return "Materials";
    case "weather":
      return "Weather / access";
    case "other":
      return "Other";
  }
}

export function messageDirectionLabel(d: MessageDirection): string {
  switch (d) {
    case "field_to_authority":
      return "Jobsite → Building department";
    case "authority_to_field":
      return "Building department → Jobsite";
    case "office_to_authority":
      return "Office → Building department";
    case "internal":
      return "Internal note";
  }
}

export function inspectionStatusLabel(s: InspectionStatus): string {
  switch (s) {
    case "requested":
      return "Requested";
    case "scheduled":
      return "On the calendar";
    case "ready_for_inspector":
      return "Ready for inspector";
    case "passed":
      return "Passed";
    case "failed":
      return "Did not pass";
    case "cancelled":
      return "Cancelled";
  }
}

export function inspectionStatusHelp(s: InspectionStatus): string {
  switch (s) {
    case "requested":
      return "Recorded for the building department lane; waiting for a date and time window.";
    case "scheduled":
      return "Day and window assigned. Prepare the area.";
    case "ready_for_inspector":
      return "Crew says the work is open and ready for the walk-through.";
    case "passed":
      return "Inspector accepted the work. Keep the card for your records.";
    case "failed":
      return "Corrections needed before re-inspection. Do not cover the work yet.";
    case "cancelled":
      return "This appointment is off. Request a new one if still needed.";
  }
}

export function sortInspections(items: Inspection[]): Inspection[] {
  const rank: Record<InspectionStatus, number> = {
    failed: 0,
    ready_for_inspector: 1,
    scheduled: 2,
    requested: 3,
    passed: 4,
    cancelled: 5,
  };
  return [...items].sort((a, b) => {
    const sr = rank[a.status] - rank[b.status];
    if (sr !== 0) return sr;
    return a.scheduledDate.localeCompare(b.scheduledDate);
  });
}

export function buildActivityWire(jobsite: Jobsite): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const r of jobsite.reports) {
    items.push({
      id: `act_r_${r.id}`,
      kind: "report",
      at: r.createdAt,
      title: r.title,
      detail: `${priorityTitle(r.priority)} · ${categoryLabel(r.category)}${
        r.sendToAuthority ? " · Wired to building department" : ""
      }${r.photos?.length ? ` · ${r.photos.length} photo${r.photos.length === 1 ? "" : "s"}` : ""}`,
      priority: r.priority,
      statusLabel: statusLabel(r.status),
      wired: r.sendToAuthority,
    });
  }

  for (const m of jobsite.messages) {
    items.push({
      id: `act_m_${m.id}`,
      kind: "message",
      at: m.createdAt,
      title: m.subject,
      detail: `${messageDirectionLabel(m.direction)}${
        m.wiredFrom === "report"
          ? " · From field report"
          : m.wiredFrom === "inspection"
            ? " · From inspection request"
            : ""
      }`,
      statusLabel:
        m.status === "sent"
          ? "Delivered"
          : m.status === "read"
            ? "Read"
            : "Replied",
      wired: m.wiredFrom === "report" || m.wiredFrom === "inspection",
    });
  }

  for (const i of jobsite.inspections) {
    items.push({
      id: `act_i_${i.id}`,
      kind: "inspection",
      at: i.updatedAt || i.createdAt,
      title: i.typeLabel,
      detail: `${i.buildingArea} · ${i.scheduledDate} · ${i.timeWindow}`,
      statusLabel: inspectionStatusLabel(i.status),
      wired: true,
    });
  }

  for (const s of jobsite.schedule ?? []) {
    items.push({
      id: `act_s_${s.id}`,
      kind: "schedule",
      at: s.updatedAt || s.createdAt,
      title: s.title,
      detail: `${s.startDate} → ${s.endDate} · ${s.progress}%`,
      statusLabel: s.status,
      wired: false,
    });
  }

  return items.sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
  );
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function formatWhen(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return "just now";
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h} hr ago`;
  const d = Math.floor(h / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

export function formatDateLabel(ymd: string): string {
  const [y, mo, d] = ymd.split("-").map(Number);
  if (!y || !mo || !d) return ymd;
  const dt = new Date(y, mo - 1, d);
  return dt.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
