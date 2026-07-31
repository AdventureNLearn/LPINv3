/**
 * Lightweight schedule dependency + critical-path helpers.
 * Not a full CPM engine — free, readable, field-usable.
 */

import { daysBetween } from "./gantt";
import type { ScheduleTask } from "./types";

export interface TaskGraphNode {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  dependsOnIds: string[];
  /** Earliest finish length along longest predecessor chain (days from project min start) */
  earlyFinish: number;
  lateFinish: number;
  totalFloat: number;
  critical: boolean;
  blockedByOpen: string[];
}

export function taskDurationDays(t: ScheduleTask): number {
  return Math.max(0, daysBetween(t.startDate, t.endDate || t.startDate));
}

/** Detect cycle; returns true if adding edge would create a cycle. */
export function wouldCreateCycle(
  tasks: ScheduleTask[],
  taskId: string,
  newDepends: string[],
): boolean {
  const map = new Map(tasks.map((t) => [t.id, t.dependsOnIds ?? []]));
  map.set(taskId, newDepends);
  const visiting = new Set<string>();
  const done = new Set<string>();
  function dfs(id: string): boolean {
    if (done.has(id)) return false;
    if (visiting.has(id)) return true;
    visiting.add(id);
    for (const d of map.get(id) ?? []) {
      if (dfs(d)) return true;
    }
    visiting.delete(id);
    done.add(id);
    return false;
  }
  return dfs(taskId);
}

/**
 * Critical = zero total float on longest-path estimate using durations.
 * Open/incomplete predecessors listed in blockedByOpen.
 */
export function analyzeSchedule(tasks: ScheduleTask[]): TaskGraphNode[] {
  const active = tasks.filter((t) => t.status !== "cancelled");
  const byId = new Map(active.map((t) => [t.id, t]));
  const early = new Map<string, number>();

  function earlyFinish(id: string, stack: Set<string>): number {
    if (early.has(id)) return early.get(id)!;
    if (stack.has(id)) return 0; // cycle guard
    stack.add(id);
    const t = byId.get(id);
    if (!t) return 0;
    const deps = (t.dependsOnIds ?? []).filter((d) => byId.has(d));
    const pred = deps.length
      ? Math.max(...deps.map((d) => earlyFinish(d, stack)))
      : 0;
    const ef = pred + taskDurationDays(t) + (t.milestone ? 0 : 0);
    early.set(id, ef);
    stack.delete(id);
    return ef;
  }

  for (const t of active) earlyFinish(t.id, new Set());

  const projectEnd = active.length
    ? Math.max(...active.map((t) => early.get(t.id) ?? 0))
    : 0;

  const late = new Map<string, number>();
  // reverse pass: successors
  const successors = new Map<string, string[]>();
  for (const t of active) {
    for (const d of t.dependsOnIds ?? []) {
      if (!successors.has(d)) successors.set(d, []);
      successors.get(d)!.push(t.id);
    }
  }

  function lateFinish(id: string, stack: Set<string>): number {
    if (late.has(id)) return late.get(id)!;
    if (stack.has(id)) return projectEnd;
    stack.add(id);
    const t = byId.get(id);
    if (!t) return projectEnd;
    const succs = successors.get(id) ?? [];
    let lf: number;
    if (!succs.length) {
      lf = projectEnd;
    } else {
      lf = Math.min(
        ...succs.map((s) => {
          const sLf = lateFinish(s, stack);
          const sTask = byId.get(s)!;
          return sLf - taskDurationDays(sTask);
        }),
      );
    }
    late.set(id, lf);
    stack.delete(id);
    return lf;
  }
  for (const t of active) lateFinish(t.id, new Set());

  return active.map((t) => {
    const ef = early.get(t.id) ?? 0;
    const lf = late.get(t.id) ?? projectEnd;
    const float = Math.max(0, lf - ef);
    const blockedByOpen = (t.dependsOnIds ?? [])
      .map((id) => byId.get(id))
      .filter((p): p is ScheduleTask => !!p && p.status !== "done")
      .map((p) => p.title);
    return {
      id: t.id,
      title: t.title,
      startDate: t.startDate,
      endDate: t.endDate,
      durationDays: taskDurationDays(t),
      dependsOnIds: t.dependsOnIds ?? [],
      earlyFinish: ef,
      lateFinish: lf,
      totalFloat: float,
      critical: float <= 0.01 && active.length > 0,
      blockedByOpen,
    };
  });
}

export function criticalTaskIds(tasks: ScheduleTask[]): Set<string> {
  return new Set(analyzeSchedule(tasks).filter((n) => n.critical).map((n) => n.id));
}

/** Tasks overlapping next N days from today (YYYY-MM-DD). */
export function lookaheadTasks(
  tasks: ScheduleTask[],
  todayYmd: string,
  days = 14,
): ScheduleTask[] {
  return tasks.filter((t) => {
    if (t.status === "cancelled" || t.status === "done") return false;
    // overlap [today, today+days]
    const end = t.endDate || t.startDate;
    // simple string compare works for ISO dates
    const windowEnd = addDaysLocal(todayYmd, days);
    return t.startDate <= windowEnd && end >= todayYmd;
  });
}

function addDaysLocal(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1);
  dt.setDate(dt.getDate() + n);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
