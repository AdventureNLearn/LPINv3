import { useMemo, useState } from "react";
import { CalendarRange, Printer, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  divisionLabel,
  scheduleStatusLabel,
  TRADE_DIVISIONS,
} from "@/lib/jobsite/divisions";
import {
  buildGanttBars,
  computeGanttWindow,
  formatYmd,
  todayMarkerLeft,
  todayYmd,
} from "@/lib/jobsite/gantt";
import { printSchedule } from "@/lib/jobsite/pdf";
import {
  CONSTRUCTION_INDUSTRIES,
  industryLabel,
} from "@/lib/jobsite/schedules";
import { useJobsiteStore } from "@/lib/jobsite/store";
import type {
  ConstructionIndustry,
  ScheduleTaskStatus,
  TradeDivision,
} from "@/lib/jobsite/types";
import { cn } from "@/lib/utils";

export function ScheduleView() {
  const jobsite = useJobsiteStore((s) => s.jobsite);
  const addScheduleTask = useJobsiteStore((s) => s.addScheduleTask);
  const updateScheduleTask = useJobsiteStore((s) => s.updateScheduleTask);
  const removeScheduleTask = useJobsiteStore((s) => s.removeScheduleTask);
  const applyIndustrySchedule = useJobsiteStore((s) => s.applyIndustrySchedule);
  const setView = useJobsiteStore((s) => s.setView);
  const [industryPick, setIndustryPick] = useState<ConstructionIndustry>(
    jobsite.industry ?? "multi_family",
  );
  const [startPick, setStartPick] = useState(
    jobsite.projectStartDate ?? todayYmd(),
  );

  const win = useMemo(
    () => computeGanttWindow(jobsite.schedule ?? [], jobsite.inspections),
    [jobsite.schedule, jobsite.inspections],
  );
  const bars = useMemo(() => buildGanttBars(jobsite), [jobsite]);
  const todayLeft = todayMarkerLeft(win);

  const [title, setTitle] = useState("");
  const [division, setDivision] = useState<TradeDivision>("general");
  const [startDate, setStartDate] = useState(todayYmd());
  const [endDate, setEndDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return formatYmd(d);
  });
  const [status, setStatus] = useState<ScheduleTaskStatus>("planned");
  const [progress, setProgress] = useState(0);
  const [contactId, setContactId] = useState("");
  const [milestone, setMilestone] = useState(false);
  const [notes, setNotes] = useState("");

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Work package title is required.");
      return;
    }
    addScheduleTask({
      title: title.trim(),
      division,
      startDate,
      endDate: milestone ? startDate : endDate,
      status,
      progress,
      contactId: contactId || undefined,
      milestone,
      notes: notes.trim() || undefined,
    });
    setTitle("");
    setNotes("");
    setProgress(0);
    setMilestone(false);
    toast.success("Added to schedule / Gantt.");
  }

  return (
    <div className="animate-enter space-y-4 sm:space-y-6">
      <header className="space-y-2">
        <span className="lpin-chip">
          <CalendarRange className="size-3" />
          Schedule · Gantt
        </span>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h1 className="font-display text-2xl font-medium tracking-tight text-fg sm:text-3xl">
              Jobsite schedule
            </h1>
            <p className="mt-1 text-sm text-fg-muted text-pretty">
              Work packages, deliveries, milestones, and inspections on one
              Gantt. Link vendors so inventory and conditions stay visible to
              the whole team.
            </p>
          </div>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={() => {
              try {
                printSchedule(jobsite);
                toast.message("Print dialog — Save as PDF.");
              } catch (err) {
                toast.error(
                  err instanceof Error ? err.message : "Print failed.",
                );
              }
            }}
          >
            <Printer className="size-3.5" />
            Print / PDF
          </Button>
        </div>
      </header>

      <section className="card-lpin space-y-3 rounded-2xl p-4">
        <p className="text-sm font-medium text-fg">
          Load basic schedule by industry
        </p>
        <p className="text-xs text-fg-muted text-pretty">
          Populates a full starter Gantt and materials list for the project type.
          Replaces existing schedule and materials on this device. Edit dates and
          quantities after load to match your contract.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Industry type</span>
            <select
              className="field-input"
              value={industryPick}
              onChange={(e) =>
                setIndustryPick(e.target.value as ConstructionIndustry)
              }
            >
              {CONSTRUCTION_INDUSTRIES.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Project start</span>
            <input
              type="date"
              className="field-input"
              value={startPick}
              onChange={(e) => setStartPick(e.target.value)}
            />
          </label>
        </div>
        <p className="text-[11px] text-fg-subtle">
          Current: {industryLabel(jobsite.industry)} ·{" "}
          {(jobsite.schedule ?? []).length} tasks ·{" "}
          {(jobsite.materials ?? []).length} material lines
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            onClick={() => {
              applyIndustrySchedule(industryPick, startPick);
              toast.success(
                `Loaded ${industryLabel(industryPick)} schedule + materials.`,
              );
            }}
          >
            Load schedule + materials
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setView("materials")}
          >
            Open materials
          </Button>
        </div>
      </section>

      {/* Gantt */}
      <section className="card-lpin overflow-hidden rounded-2xl">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2 sm:px-4">
          <p className="text-xs font-medium text-fg-muted">
            Window {win.start} → {win.end}
          </p>
          <p className="text-[10px] text-fg-subtle">
            Gold = in progress · Red = blocked · Green = done · Blue = planned
          </p>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[640px] p-2 sm:p-3">
            {/* ticks */}
            <div className="mb-2 ml-[7.5rem] flex justify-between text-[9px] text-fg-subtle sm:ml-36">
              {win.ticks.filter((_, i) => i % Math.ceil(win.ticks.length / 6) === 0 || i === win.ticks.length - 1).map((t) => (
                <span key={t}>{t.slice(5)}</span>
              ))}
            </div>
            <div className="relative space-y-1.5">
              {/* today line */}
              <div
                className="pointer-events-none absolute bottom-0 top-0 z-10 w-px bg-coral"
                style={{
                  left: `calc(7.5rem + (100% - 7.5rem) * ${todayLeft})`,
                }}
                title="Today"
              />
              {bars.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-fg-subtle">
                  No schedule bars yet — add a work package below.
                </p>
              ) : (
                bars.map((b) => (
                  <div
                    key={`${b.kind}-${b.id}`}
                    className="grid grid-cols-[7.5rem_1fr] items-center gap-2 sm:grid-cols-[9rem_1fr]"
                  >
                    <div className="min-w-0 pr-1">
                      <p className="truncate text-[11px] font-medium text-fg">
                        {b.label}
                      </p>
                      <p className="truncate text-[10px] text-fg-subtle">
                        {b.kind === "inspection" ? "Inspect" : b.division ? divisionLabel(b.division) : b.sublabel}
                      </p>
                    </div>
                    <div className="relative h-8 rounded-lg bg-surface-1 ring-1 ring-border">
                      <div
                        className={cn(
                          "absolute top-1 flex h-6 items-center overflow-hidden rounded-md px-1.5 text-[9px] font-semibold text-ink shadow-sm",
                          b.milestone && "w-3 !rounded-full px-0",
                        )}
                        style={{
                          left: `${b.left * 100}%`,
                          width: b.milestone
                            ? "12px"
                            : `${Math.max(b.width * 100, 2)}%`,
                          background: b.color,
                        }}
                        title={`${b.startDate} → ${b.endDate} · ${b.status}`}
                      >
                        {!b.milestone ? (
                          <span className="truncate">
                            {b.progress > 0 ? `${b.progress}% · ` : ""}
                            {b.contactName?.split(" · ")[0] || b.status}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Add task */}
      <form onSubmit={onAdd} className="card-lpin space-y-3 rounded-2xl p-4">
        <p className="text-sm font-medium text-fg">Add work package</p>
        <label className="block space-y-1">
          <span className="text-xs text-fg-subtle">Title</span>
          <input
            className="field-input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. MEP rough-in floors 4–5"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Division</span>
            <select
              className="field-input"
              value={division}
              onChange={(e) => setDivision(e.target.value as TradeDivision)}
            >
              {TRADE_DIVISIONS.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Vendor / contact</span>
            <select
              className="field-input"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            >
              <option value="">— none —</option>
              {(jobsite.contacts ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company} ({divisionLabel(c.division)})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Start</span>
            <input
              type="date"
              className="field-input"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">End</span>
            <input
              type="date"
              className="field-input"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              disabled={milestone}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Status</span>
            <select
              className="field-input"
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as ScheduleTaskStatus)
              }
            >
              <option value="planned">Planned</option>
              <option value="in_progress">In progress</option>
              <option value="blocked">Blocked</option>
              <option value="done">Done</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">
              Progress {progress}%
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              className="w-full accent-[var(--color-gold)]"
            />
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-surface-1 px-3">
            <input
              type="checkbox"
              className="size-5 accent-[var(--color-gold)]"
              checked={milestone}
              onChange={(e) => setMilestone(e.target.checked)}
            />
            <span className="text-sm text-fg">Milestone (single day)</span>
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-fg-subtle">Notes</span>
          <textarea
            className="field-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Conditions, hold points, dependencies"
          />
        </label>
        <Button type="submit" className="w-full">
          <Plus />
          Add to Gantt
        </Button>
      </form>

      {/* List */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-fg">Work packages</h2>
        {(jobsite.schedule ?? []).length === 0 ? (
          <p className="text-sm text-fg-subtle">None yet.</p>
        ) : (
          (jobsite.schedule ?? []).map((t) => {
            const contact = (jobsite.contacts ?? []).find(
              (c) => c.id === t.contactId,
            );
            return (
              <article key={t.id} className="card-lpin rounded-2xl p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">
                    {scheduleStatusLabel(t.status)}
                  </Badge>
                  <Badge variant="default">{divisionLabel(t.division)}</Badge>
                  {t.milestone ? (
                    <Badge variant="honesty">Milestone</Badge>
                  ) : null}
                </div>
                <h3 className="mt-2 text-sm font-medium text-fg">{t.title}</h3>
                <p className="mt-1 text-xs text-fg-subtle">
                  {t.startDate} → {t.endDate} · {t.progress}%
                  {contact ? ` · ${contact.company}` : ""}
                </p>
                {t.notes ? (
                  <p className="mt-1 text-sm text-fg-muted text-pretty">
                    {t.notes}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      "planned",
                      "in_progress",
                      "blocked",
                      "done",
                    ] as ScheduleTaskStatus[]
                  ).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => {
                        updateScheduleTask(t.id, {
                          status: st,
                          progress:
                            st === "done"
                              ? 100
                              : st === "planned"
                                ? 0
                                : t.progress,
                        });
                      }}
                      className={cn(
                        "min-h-9 rounded-lg border px-2.5 text-[11px] font-medium",
                        t.status === st
                          ? "border-[color-mix(in_oklab,var(--color-gold)_40%,var(--color-border))] bg-surface-2 text-fg"
                          : "border-border bg-surface-1 text-fg-muted",
                      )}
                    >
                      {scheduleStatusLabel(st)}
                    </button>
                  ))}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      removeScheduleTask(t.id);
                      toast.message("Removed from schedule.");
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Remove
                  </Button>
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
}
