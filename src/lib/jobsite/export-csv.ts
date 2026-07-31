/**
 * Free CSV export for schedule + materials (Excel / Sheets compatible).
 */

import { divisionLabel, scheduleStatusLabel } from "./divisions";
import { materialLineCost } from "./apply-template";
import type { Jobsite, MaterialLine, ScheduleTask } from "./types";

function csvEscape(v: string | number | undefined | null): string {
  const s = v == null ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function scheduleToCsv(tasks: ScheduleTask[]): string {
  const header = [
    "id",
    "title",
    "division",
    "start",
    "end",
    "status",
    "progress",
    "milestone",
    "depends_on",
    "notes",
  ];
  const rows = tasks.map((t) =>
    [
      t.id,
      t.title,
      divisionLabel(t.division),
      t.startDate,
      t.endDate,
      scheduleStatusLabel(t.status),
      t.progress,
      t.milestone ? "yes" : "no",
      (t.dependsOnIds ?? []).join(";"),
      t.notes ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function materialsToCsv(lines: MaterialLine[]): string {
  const header = [
    "id",
    "name",
    "division",
    "unit",
    "qty_required",
    "qty_on_hand",
    "unit_cost",
    "quoted_unit_cost",
    "line_total",
    "status",
    "spec",
    "po_note",
  ];
  const rows = lines.map((m) =>
    [
      m.id,
      m.name,
      divisionLabel(m.division),
      m.unit,
      m.qtyRequired,
      m.qtyOnHand,
      m.unitCost,
      m.quotedUnitCost ?? "",
      materialLineCost(m),
      m.status,
      m.specNote ?? "",
      m.poNote ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function downloadScheduleCsv(jobsite: Jobsite) {
  const slug = (jobsite.name || "jobsite").replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
  download(`${slug}-schedule.csv`, scheduleToCsv(jobsite.schedule ?? []));
}

export function downloadMaterialsCsv(jobsite: Jobsite) {
  const slug = (jobsite.name || "jobsite").replace(/[^a-z0-9]+/gi, "-").slice(0, 40);
  download(`${slug}-materials.csv`, materialsToCsv(jobsite.materials ?? []));
}
