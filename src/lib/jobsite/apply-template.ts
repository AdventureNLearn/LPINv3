/**
 * Apply industry schedule + materials templates onto a jobsite.
 */

import { addDays, formatYmd } from "./gantt";
import { getIndustryTemplate } from "./schedules";
import type {
  ConstructionIndustry,
  Jobsite,
  MaterialLine,
  ScheduleTask,
} from "./types";
import { newId } from "./domain";

export function applyIndustryTemplate(
  jobsite: Jobsite,
  industry: ConstructionIndustry,
  projectStartDate?: string,
  opts?: { replaceSchedule?: boolean; replaceMaterials?: boolean },
): Jobsite {
  const start = projectStartDate || jobsite.projectStartDate || formatYmd(new Date());
  const tpl = getIndustryTemplate(industry);
  const now = new Date().toISOString();
  const replaceSchedule = opts?.replaceSchedule !== false;
  const replaceMaterials = opts?.replaceMaterials !== false;

  const tasks: ScheduleTask[] = tpl.tasks.map((t, idx, arr) => {
    const s = addDays(start, t.startOffset);
    const e = addDays(start, t.startOffset + Math.max(0, t.durationDays));
    const id = newId("sch");
    return {
      id,
      title: t.title,
      division: t.division,
      startDate: s,
      endDate: t.milestone ? s : e,
      status: "planned" as const,
      progress: 0,
      milestone: t.milestone,
      notes: t.notes,
      createdAt: now,
      updatedAt: now,
    };
  });
  // Wire dependsOn after all ids exist (map by index)
  for (let i = 1; i < tasks.length; i++) {
    tasks[i].dependsOnIds = [tasks[i - 1].id];
  }

  // Build materials and link to schedule by title fragment
  const materials: MaterialLine[] = tpl.materials.map((m) => {
    let scheduleTaskId: string | undefined;
    if (m.scheduleTitleIncludes) {
      const hit = tasks.find((t) =>
        t.title.toLowerCase().includes(m.scheduleTitleIncludes!.toLowerCase()),
      );
      scheduleTaskId = hit?.id;
    }
    return {
      id: newId("mat"),
      name: m.name,
      division: m.division,
      unit: m.unit,
      qtyRequired: m.qtyRequired,
      qtyOnHand: 0,
      unitCost: m.unitCost,
      status: "needed" as const,
      scheduleTaskId,
      specNote: m.specNote,
      createdAt: now,
      updatedAt: now,
    };
  });

  return {
    ...jobsite,
    industry,
    projectStartDate: start,
    isDemo: false,
    updatedAt: now,
    schedule: replaceSchedule
      ? tasks
      : [...tasks, ...(jobsite.schedule ?? [])],
    materials: replaceMaterials
      ? materials
      : [...materials, ...(jobsite.materials ?? [])],
  };
}

export function materialLineCost(m: MaterialLine): number {
  const unit = m.quotedUnitCost ?? m.unitCost;
  return unit * m.qtyRequired;
}

export function materialOnHandCost(m: MaterialLine): number {
  const unit = m.quotedUnitCost ?? m.unitCost;
  return unit * m.qtyOnHand;
}

export function materialsTotals(lines: MaterialLine[]): {
  budget: number;
  onHandValue: number;
  shortQtyLines: number;
  neededLines: number;
} {
  let budget = 0;
  let onHandValue = 0;
  let shortQtyLines = 0;
  let neededLines = 0;
  for (const m of lines) {
    budget += materialLineCost(m);
    onHandValue += materialOnHandCost(m);
    if (m.qtyOnHand < m.qtyRequired) shortQtyLines += 1;
    if (m.status === "needed" || m.status === "quoted") neededLines += 1;
  }
  return { budget, onHandValue, shortQtyLines, neededLines };
}
