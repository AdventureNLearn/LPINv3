/**
 * Layout helpers for the jobsite Gantt (schedule tasks + inspections).
 */

import { scheduleStatusColor } from "./divisions";
import type {
  GanttBar,
  Inspection,
  Jobsite,
  ProjectContact,
  ScheduleTask,
} from "./types";

const DAY_MS = 86_400_000;

export function parseYmd(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function formatYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(ymd: string, n: number): string {
  const d = parseYmd(ymd);
  d.setDate(d.getDate() + n);
  return formatYmd(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / DAY_MS);
}

export interface GanttWindow {
  start: string;
  end: string;
  days: number;
  ticks: string[];
}

/** Visible window spanning all bars, with padding. */
export function computeGanttWindow(
  tasks: ScheduleTask[],
  inspections: Inspection[],
  padDays = 3,
): GanttWindow {
  const dates: string[] = [];
  for (const t of tasks) {
    if (t.status === "cancelled") continue;
    dates.push(t.startDate, t.endDate || t.startDate);
  }
  for (const i of inspections) {
    if (i.status === "cancelled") continue;
    dates.push(i.scheduledDate, i.endDate || i.scheduledDate);
  }
  if (!dates.length) {
    const today = formatYmd(new Date());
    return {
      start: addDays(today, -3),
      end: addDays(today, 21),
      days: 24,
      ticks: buildTicks(addDays(today, -3), addDays(today, 21)),
    };
  }
  dates.sort();
  const start = addDays(dates[0], -padDays);
  const end = addDays(dates[dates.length - 1], padDays);
  const days = Math.max(1, daysBetween(start, end));
  return { start, end, days, ticks: buildTicks(start, end) };
}

function buildTicks(start: string, end: string): string[] {
  const out: string[] = [];
  const total = daysBetween(start, end);
  const step = total > 60 ? 7 : total > 28 ? 3 : 1;
  for (let i = 0; i <= total; i += step) {
    out.push(addDays(start, i));
  }
  if (out[out.length - 1] !== end) out.push(end);
  return out;
}

function contactName(
  contacts: ProjectContact[],
  id?: string,
): string | undefined {
  if (!id) return undefined;
  const c = contacts.find((x) => x.id === id);
  return c ? `${c.company}${c.contactName ? ` · ${c.contactName}` : ""}` : undefined;
}

export function buildGanttBars(jobsite: Jobsite): GanttBar[] {
  const win = computeGanttWindow(jobsite.schedule, jobsite.inspections);
  const bars: GanttBar[] = [];

  for (const t of jobsite.schedule) {
    if (t.status === "cancelled") continue;
    const start = t.startDate < win.start ? win.start : t.startDate;
    const end = (t.endDate || t.startDate) > win.end ? win.end : t.endDate || t.startDate;
    const leftDays = Math.max(0, daysBetween(win.start, start));
    const span = Math.max(t.milestone ? 0.4 : 1, daysBetween(start, end) + 1);
    bars.push({
      id: t.id,
      kind: "task",
      label: t.title,
      sublabel: t.milestone ? "Milestone" : "Work package",
      startDate: t.startDate,
      endDate: t.endDate || t.startDate,
      status: t.status,
      progress: t.progress,
      left: leftDays / win.days,
      width: Math.min(1 - leftDays / win.days, span / win.days),
      color: scheduleStatusColor(t.status),
      milestone: t.milestone,
      contactName: contactName(jobsite.contacts, t.contactId),
      division: t.division,
    });
  }

  for (const i of jobsite.inspections) {
    if (i.status === "cancelled") continue;
    const endDate = i.endDate || i.scheduledDate;
    const start = i.scheduledDate < win.start ? win.start : i.scheduledDate;
    const end = endDate > win.end ? win.end : endDate;
    const leftDays = Math.max(0, daysBetween(win.start, start));
    const span = Math.max(1, daysBetween(start, end) + 1);
    bars.push({
      id: i.id,
      kind: "inspection",
      label: i.typeLabel,
      sublabel: `Inspection · ${i.buildingArea}`,
      startDate: i.scheduledDate,
      endDate,
      status: i.status,
      progress:
        i.status === "passed" ? 100 : i.status === "ready_for_inspector" ? 80 : 40,
      left: leftDays / win.days,
      width: Math.min(1 - leftDays / win.days, span / win.days),
      color: scheduleStatusColor(i.status),
      milestone: false,
      contactName: contactName(jobsite.contacts, i.contactId),
    });
  }

  return bars.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

export function todayYmd(): string {
  return formatYmd(new Date());
}

export function todayMarkerLeft(win: GanttWindow): number {
  const d = daysBetween(win.start, todayYmd());
  if (d < 0) return 0;
  if (d > win.days) return 1;
  return d / win.days;
}
