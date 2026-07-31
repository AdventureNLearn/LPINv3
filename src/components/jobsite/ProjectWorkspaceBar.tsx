/**
 * Multi-project workspace bar for Jobsite:
 * project switcher, sync lock, multi-window open, cross-project lists/templates.
 */

import { useMemo, useState } from "react";
import {
  ChevronDown,
  Columns2,
  Filter,
  Layers,
  Lock,
  LockOpen,
  MapPinned,
  PanelRightOpen,
  RefreshCw,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { usePortfolioStore } from "@/lib/jobsite/portfolio-store";
import {
  ENV_LABELS,
  INTEREST_LABELS,
  type ProjectMeta,
} from "@/lib/jobsite/project-types";
import { industryLabel } from "@/lib/jobsite/schedules";
import { openJobsiteWindow } from "@/lib/jobsite/project-sync";
import { useProjectWorkspace } from "@/lib/jobsite/use-project-workspace";
import { cn } from "@/lib/utils";

export function ProjectWorkspaceBar() {
  const ws = useProjectWorkspace();
  const resolveListMembers = usePortfolioStore((s) => s.resolveListMembers);
  const reseedBaseline = usePortfolioStore((s) => s.reseedBaseline);
  const addList = usePortfolioStore((s) => s.addList);

  const [query, setQuery] = useState("");
  const [industryFilter, setIndustryFilter] = useState<string>("");
  const [stateFilter, setStateFilter] = useState<string>("");
  const [listId, setListId] = useState<string>("");
  const [tab, setTab] = useState<"projects" | "lists">("projects");

  const activeMeta = useMemo(
    () => ws.metaList.find((m) => m.id === ws.activeProjectId),
    [ws.metaList, ws.activeProjectId],
  );

  const states = useMemo(
    () => [...new Set(ws.metaList.map((m) => m.stateCode))].sort(),
    [ws.metaList],
  );

  const filtered = useMemo(() => {
    let rows = ws.metaList;
    if (listId) {
      const list = ws.lists.find((l) => l.id === listId);
      if (list) rows = resolveListMembers(list);
    }
    if (industryFilter) {
      rows = rows.filter((m) => m.industry === industryFilter);
    }
    if (stateFilter) {
      rows = rows.filter((m) => m.stateCode === stateFilter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      rows = rows.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.city.toLowerCase().includes(q) ||
          m.stateCode.toLowerCase().includes(q) ||
          m.interests.some((t) => t.includes(q)) ||
          m.env.some((e) => e.includes(q)),
      );
    }
    return rows;
  }, [
    ws.metaList,
    ws.lists,
    listId,
    industryFilter,
    stateFilter,
    query,
    resolveListMembers,
  ]);

  return (
    <section className="card-lpin space-y-3 rounded-2xl p-3 sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
              Project workspace
            </p>
            {ws.circuitOpen ? (
              <Badge className="border-0 bg-disputed/20 text-[10px] text-disputed">
                Sync paused {Math.ceil((ws.circuitRemainingMs || 0) / 1000)}s
                (stability)
              </Badge>
            ) : ws.locked ? (
              <Badge className="bg-disputed/15 text-disputed border-0 text-[10px]">
                <Lock className="mr-1 size-3" />
                Locked to this window
              </Badge>
            ) : (
              <Badge className="bg-gold/10 text-gold border-0 text-[10px]">
                <LockOpen className="mr-1 size-3" />
                Sync across windows
              </Badge>
            )}
            {ws.ready ? (
              <span className="text-[10px] text-fg-subtle">
                {ws.stats.projectCount} projects · {ws.stats.stateCount} states (
                {Math.round(ws.stats.stateShareOfUs * 100)}% US)
              </span>
            ) : null}
          </div>
          <h2 className="truncate text-base font-semibold text-fg sm:text-lg">
            {ws.jobsite.name}
          </h2>
          <p className="text-xs text-fg-muted">
            {ws.jobsite.cityState || ws.jobsite.location}
            {activeMeta ? (
              <>
                {" "}
                · {industryLabel(activeMeta.industry)} · {activeMeta.phase}
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            size="sm"
            variant={ws.locked ? "default" : "outline"}
            className={cn(ws.locked && "btn-sunrise")}
            onClick={() => {
              ws.toggleLock();
              toast.message(
                ws.locked
                  ? "Unlocked — this window follows shared project changes."
                  : "Locked — this window stays on its project while others switch.",
              );
            }}
            title={
              ws.locked
                ? "Unlock: follow shared project"
                : "Lock: keep this project in this window only"
            }
          >
            {ws.locked ? (
              <Lock className="size-3.5" />
            ) : (
              <LockOpen className="size-3.5" />
            )}
            {ws.locked ? "Locked" : "Lock"}
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              ws.openProjectWindows();
              toast.message(
                "Opened Board, Map, Schedule, Materials for this project.",
              );
            }}
            title="Open 4 windows for this project (they stay in sync when unlocked)"
          >
            <Columns2 className="size-3.5" />
            <span className="hidden sm:inline">4 windows</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => openJobsiteWindow({ projectId: ws.activeProjectId, view: "map" })}
            title="Open map for this project"
          >
            <MapPinned className="size-3.5" />
            <span className="hidden lg:inline">Map</span>
          </Button>

          <Button
            size="sm"
            variant="outline"
            onClick={() => ws.setPanelOpen(!ws.panelOpen)}
          >
            <Layers className="size-3.5" />
            Portfolio
            <ChevronDown
              className={cn(
                "size-3.5 transition-transform",
                ws.panelOpen && "rotate-180",
              )}
            />
          </Button>
        </div>
      </div>

      {activeMeta ? (
        <div className="flex flex-wrap gap-1">
          {activeMeta.env.slice(0, 4).map((e) => (
            <span
              key={e}
              className="rounded-full border border-border bg-surface-1 px-2 py-0.5 text-[10px] text-fg-muted"
              title={ENV_LABELS[e]}
            >
              {ENV_LABELS[e]}
            </span>
          ))}
          {activeMeta.interests.slice(0, 4).map((t) => (
            <span
              key={t}
              className="rounded-full border border-gold/25 bg-gold/5 px-2 py-0.5 text-[10px] text-gold"
              title={INTEREST_LABELS[t]}
            >
              {INTEREST_LABELS[t]}
            </span>
          ))}
        </div>
      ) : null}

      <p className="text-[11px] leading-relaxed text-fg-subtle text-pretty">
        Unlocked windows switch together when you change project. Lock a window
        to pin one project on a monitor while you browse others — or open a list
        of peers side-by-side.
      </p>

      {ws.panelOpen ? (
        <div className="space-y-3 border-t border-border pt-3">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium",
                tab === "projects"
                  ? "btn-sunrise text-accent-fg"
                  : "bg-surface-1 text-fg-muted",
              )}
              onClick={() => setTab("projects")}
            >
              Projects
            </button>
            <button
              type="button"
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium",
                tab === "lists"
                  ? "btn-sunrise text-accent-fg"
                  : "bg-surface-1 text-fg-muted",
              )}
              onClick={() => setTab("lists")}
            >
              Lists & templates
            </button>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-xs"
              onClick={() => {
                reseedBaseline(true);
                toast.message("Baseline refreshed (your edits kept).");
              }}
            >
              <RefreshCw className="size-3.5" />
              Reseed
            </Button>
          </div>

          {tab === "projects" ? (
            <>
              <div className="flex flex-wrap gap-2">
                <label className="relative min-w-[12rem] flex-1">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-fg-subtle" />
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search name, city, tag…"
                    className="w-full rounded-xl border border-border bg-surface-1 py-2 pl-8 pr-3 text-sm text-fg outline-none focus:border-gold/40"
                  />
                </label>
                <select
                  value={industryFilter}
                  onChange={(e) => setIndustryFilter(e.target.value)}
                  className="rounded-xl border border-border bg-surface-1 px-2 py-2 text-xs text-fg"
                >
                  <option value="">All industries</option>
                  {[
                    "single_family",
                    "multi_family",
                    "commercial",
                    "industrial",
                    "civil",
                    "renovation",
                    "hospitality",
                    "healthcare",
                    "education",
                  ].map((id) => (
                    <option key={id} value={id}>
                      {industryLabel(id as ProjectMeta["industry"])}
                    </option>
                  ))}
                </select>
                <select
                  value={stateFilter}
                  onChange={(e) => setStateFilter(e.target.value)}
                  className="rounded-xl border border-border bg-surface-1 px-2 py-2 text-xs text-fg"
                >
                  <option value="">All states</option>
                  {states.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <select
                  value={listId}
                  onChange={(e) => setListId(e.target.value)}
                  className="rounded-xl border border-border bg-surface-1 px-2 py-2 text-xs text-fg"
                >
                  <option value="">All / no list filter</option>
                  {ws.lists.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name} ({l.projectIds.length || "auto"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="max-h-72 space-y-1 overflow-y-auto pr-1">
                {filtered.map((m) => (
                  <ProjectRow
                    key={m.id}
                    meta={m}
                    active={m.id === ws.activeProjectId}
                    onOpen={() => {
                      ws.switchProject(m.id);
                      toast.message(`Active project: ${m.name}`);
                    }}
                    onOpenLocked={() => {
                      openJobsiteWindow({
                        projectId: m.id,
                        view: "feed",
                        locked: true,
                        name: `lpin-lock-${m.id}`,
                      });
                      toast.message(`Locked window: ${m.name}`);
                    }}
                    onOpenMap={() =>
                      openJobsiteWindow({
                        projectId: m.id,
                        view: "map",
                        locked: ws.locked,
                      })
                    }
                  />
                ))}
                {filtered.length === 0 ? (
                  <p className="py-6 text-center text-xs text-fg-subtle">
                    No projects match filters.
                  </p>
                ) : null}
              </div>
            </>
          ) : (
            <ListsPanel
              lists={ws.lists}
              resolveListMembers={resolveListMembers}
              onOpenList={(ids) => {
                if (ids[0]) ws.switchProject(ids[0]);
              }}
              onOpenCompare={(ids) => {
                ws.openLockedCompare(ids);
                toast.message(
                  `Opened ${Math.min(4, ids.length)} locked windows for compare.`,
                );
              }}
              onCreateList={() => {
                const id = addList({
                  name: "New compare list",
                  description: "Pin projects for cross-monitor work.",
                  projectIds: [ws.activeProjectId].filter(Boolean),
                });
                toast.message("List created — add projects from the portfolio.");
                return id;
              }}
            />
          )}
        </div>
      ) : null}
    </section>
  );
}

function ProjectRow({
  meta,
  active,
  onOpen,
  onOpenLocked,
  onOpenMap,
}: {
  meta: ProjectMeta;
  active: boolean;
  onOpen: () => void;
  onOpenLocked: () => void;
  onOpenMap: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-xl border px-2.5 py-2 transition-colors",
        active
          ? "border-gold/40 bg-[color-mix(in_oklab,var(--color-gold)_10%,var(--color-surface))]"
          : "border-border bg-surface-1 hover:border-gold/25",
      )}
    >
      <button
        type="button"
        onClick={onOpen}
        className="min-w-0 flex-1 text-left"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-fg">{meta.name}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wide text-fg-subtle">
            {meta.stateCode}
          </span>
          {active ? (
            <span className="text-[10px] text-gold">active</span>
          ) : null}
        </div>
        <p className="text-[11px] text-fg-muted">
          {meta.city} · {industryLabel(meta.industry)} · {meta.phase}
        </p>
        <p className="mt-0.5 line-clamp-1 text-[10px] text-fg-subtle">
          {meta.blurb}
        </p>
      </button>
      <div className="flex shrink-0 flex-col gap-1">
        <button
          type="button"
          title="Open locked window (won't follow sync)"
          onClick={onOpenLocked}
          className="rounded-lg border border-border p-1.5 text-fg-muted hover:border-gold/40 hover:text-fg"
        >
          <Lock className="size-3.5" />
        </button>
        <button
          type="button"
          title="Open map window"
          onClick={onOpenMap}
          className="rounded-lg border border-border p-1.5 text-fg-muted hover:border-gold/40 hover:text-fg"
        >
          <PanelRightOpen className="size-3.5" />
        </button>
      </div>
    </div>
  );
}

function ListsPanel({
  lists,
  resolveListMembers,
  onOpenList,
  onOpenCompare,
  onCreateList,
}: {
  lists: ReturnType<typeof usePortfolioStore.getState>["lists"];
  resolveListMembers: (l: (typeof lists)[0]) => ProjectMeta[];
  onOpenList: (ids: string[]) => void;
  onOpenCompare: (ids: string[]) => void;
  onCreateList: () => string;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-fg-muted">
        Templates group the same industry or shared interests so you can park
        matching project slices on different monitors without losing sync control.
      </p>
      <Button size="sm" variant="outline" onClick={() => onCreateList()}>
        <Filter className="size-3.5" />
        New list
      </Button>
      <div className="max-h-80 space-y-2 overflow-y-auto">
        {lists.map((list) => {
          const members = resolveListMembers(list);
          return (
            <div
              key={list.id}
              className="rounded-xl border border-border bg-surface-1 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-medium text-fg">{list.name}</p>
                  {list.description ? (
                    <p className="text-[11px] text-fg-subtle">{list.description}</p>
                  ) : null}
                  <p className="mt-1 text-[10px] text-fg-muted">
                    {members.length} projects
                    {list.builtIn ? " · built-in template" : " · custom"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={members.length === 0}
                    onClick={() => onOpenList(members.map((m) => m.id))}
                  >
                    Open first
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={members.length === 0}
                    onClick={() => onOpenCompare(members.map((m) => m.id))}
                    title="Open up to 4 locked windows for side-by-side compare"
                  >
                    <Columns2 className="size-3.5" />
                    Compare
                  </Button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {members.slice(0, 8).map((m) => (
                  <span
                    key={m.id}
                    className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] text-fg-muted"
                  >
                    {m.stateCode} · {m.name.slice(0, 28)}
                    {m.name.length > 28 ? "…" : ""}
                  </span>
                ))}
                {members.length > 8 ? (
                  <span className="text-[10px] text-fg-subtle">
                    +{members.length - 8} more
                  </span>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Compact mobile strip — lock + project name only */
export function ProjectWorkspaceCompact() {
  const ws = useProjectWorkspace();
  return (
    <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface-1 px-3 py-2 md:hidden">
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-fg">{ws.jobsite.name}</p>
        <p className="truncate text-[10px] text-fg-subtle">
          {ws.jobsite.cityState || ws.jobsite.location}
        </p>
      </div>
      <button
        type="button"
        onClick={() => ws.toggleLock()}
        className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-2 text-[11px] text-fg-muted"
      >
        {ws.locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
        {ws.locked ? "Locked" : "Sync"}
      </button>
    </div>
  );
}
