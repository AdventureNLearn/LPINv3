import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Building2,
  CalendarClock,
  CalendarRange,
  Camera,
  CheckCheck,
  CircleDot,
  ClipboardList,
  Copy,
  FolderOpen,
  HardHat,
  Package,
  ImagePlus,
  Info,
  Landmark,
  LayoutDashboard,
  Link2,
  Mail,
  MessageSquare,
  Plus,
  Printer,
  Radio,
  RotateCcw,
  Send,
  Shield,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  ProjectView,
  UsScopeBanner,
} from "@/components/jobsite/ProjectPanel";
import { MaterialsView } from "@/components/jobsite/MaterialsView";
import { ScheduleView } from "@/components/jobsite/ScheduleView";
import { ContactsView } from "@/components/jobsite/ContactsView";
import {
  HarborRulesCard,
  IntegrityNotice,
} from "@/components/integrity/HarborRules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { JOBSITE_KERNEL_LINES } from "@/lib/integrity";
import {
  buildActivityWire,
  buildDeskSummary,
  buildPrintHtml,
  buildReadinessPacket,
  categoryLabel,
  evaluateReadiness,
  formatDateLabel,
  formatWhen,
  inspectionStatusHelp,
  inspectionStatusLabel,
  messageDirectionLabel,
  priorityHelp,
  priorityTitle,
  roleHelp,
  roleLabel,
  sortInspections,
  sortReports,
  statusLabel,
  urgencyLabel,
} from "@/lib/jobsite/domain";
import {
  buildMailtoHref,
  downloadPack,
  openPrintPacket,
} from "@/lib/jobsite/pack";
import {
  printBoard,
  printFullProject,
  printReport,
} from "@/lib/jobsite/pdf";
import {
  fileToReportPhoto,
  MAX_PHOTOS_PER_REPORT,
} from "@/lib/jobsite/photos";
import { useJobsiteStore } from "@/lib/jobsite/store";
import type {
  ActivityItem,
  AuthorityMessage,
  FieldReport,
  JobsiteView,
  Inspection,
  InspectionStatus,
  MessageDirection,
  Priority,
  ReportCategory,
  ReportPhoto,
  Role,
  Urgency,
} from "@/lib/jobsite/types";
import { cn } from "@/lib/utils";

export function JobsiteApp() {
  const view = useJobsiteStore((s) => s.view);

  return (
    <AppShell active="jobsite" mobileNav={<JobsiteBottomNav />}>
      <main
        className={cn(
          "mx-auto w-full px-3 py-4 sm:px-6 sm:py-8",
          view === "feed" || view === "desk" || view === "schedule" || view === "contacts" || view === "materials"
            ? "max-w-6xl"
            : "max-w-xl sm:max-w-2xl",
        )}
      >
        {view === "report" ? (
          <ReportView />
        ) : view === "messages" ? (
          <MessagesView />
        ) : view === "inspections" ? (
          <InspectionsView />
        ) : view === "desk" ? (
          <DeskView />
        ) : view === "schedule" ? (
          <div className="space-y-4">
            <DesktopNav active="schedule" />
            <ScheduleView />
          </div>
        ) : view === "contacts" ? (
          <div className="space-y-4">
            <DesktopNav active="contacts" />
            <ContactsView />
          </div>
        ) : view === "materials" ? (
          <div className="space-y-4">
            <DesktopNav active="materials" />
            <MaterialsView />
          </div>
        ) : view === "project" ? (
          <div className="space-y-4">
            <DesktopNav active="project" />
            <ProjectView />
          </div>
        ) : (
          <FeedView />
        )}
      </main>
    </AppShell>
  );
}

const NAV_ITEMS: {
  id: JobsiteView;
  label: string;
  short: string;
  icon: React.ReactNode;
}[] = [
  {
    id: "feed",
    label: "Board",
    short: "Board",
    icon: <LayoutDashboard className="size-5" />,
  },
  {
    id: "report",
    label: "Report",
    short: "Report",
    icon: <ClipboardList className="size-5" />,
  },
  {
    id: "schedule",
    label: "Schedule",
    short: "Gantt",
    icon: <CalendarRange className="size-5" />,
  },
  {
    id: "contacts",
    label: "Vendors",
    short: "Vendors",
    icon: <Users className="size-5" />,
  },
  {
    id: "inspections",
    label: "Inspect",
    short: "Inspect",
    icon: <CalendarClock className="size-5" />,
  },
  {
    id: "desk",
    label: "Desk",
    short: "Desk",
    icon: <HardHat className="size-5" />,
  },
  {
    id: "materials",
    label: "Materials",
    short: "Mats",
    icon: <Package className="size-5" />,
  },
  {
    id: "project",
    label: "Jobsite",
    short: "Site",
    icon: <FolderOpen className="size-5" />,
  },
];

function JobsiteBottomNav() {
  const view = useJobsiteStore((s) => s.view);
  const setView = useJobsiteStore((s) => s.setView);
  const reports = useJobsiteStore((s) => s.jobsite.reports);
  const messages = useJobsiteStore((s) => s.jobsite.messages);
  const p0Open = reports.filter(
    (r) => r.priority === "P0" && r.status !== "resolved",
  ).length;
  const unread = messages.filter((m) => m.status === "sent").length;

  return (
    <nav
      className="bottom-nav"
      style={{ ["--bottom-nav-cols" as string]: String(NAV_ITEMS.length) }}
      aria-label="Jobsite"
    >
      {NAV_ITEMS.map((item) => {
        const badge =
          item.id === "desk"
            ? p0Open
            : item.id === "messages"
              ? unread
              : 0;
        return (
          <button
            key={item.id}
            type="button"
            className="bottom-nav-item relative"
            data-active={view === item.id}
            onClick={() => setView(item.id)}
          >
            <span className="relative">
              {item.icon}
              {badge > 0 ? (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-disputed px-1 text-[9px] font-semibold text-white">
                  {badge}
                </span>
              ) : null}
            </span>
            <span>{item.short}</span>
          </button>
        );
      })}
    </nav>
  );
}

function DesktopNav({ active }: { active: JobsiteView }) {
  const setView = useJobsiteStore((s) => s.setView);
  return (
    <div
      className="hidden gap-1 rounded-2xl border border-[color-mix(in_oklab,var(--color-gold)_18%,var(--color-border))] bg-surface p-1 md:grid md:grid-cols-4 lg:grid-cols-8"
      role="tablist"
      aria-label="Jobsite desktop"
    >
      {NAV_ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          role="tab"
          aria-selected={active === item.id}
          onClick={() => setView(item.id)}
          className={cn(
            "flex min-h-11 items-center justify-center gap-1.5 rounded-xl px-2 text-sm font-medium transition-colors",
            active === item.id
              ? "bg-[color-mix(in_oklab,var(--color-gold)_14%,var(--color-surface-2))] text-gold"
              : "text-fg-muted hover:bg-surface-1 hover:text-fg",
          )}
        >
          {item.icon}
          <span className="hidden lg:inline">{item.label}</span>
        </button>
      ))}
    </div>
  );
}

function BackToFeed() {
  const setView = useJobsiteStore((s) => s.setView);
  return (
    <button
      type="button"
      onClick={() => setView("feed")}
      className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-gold"
    >
      <ArrowLeft className="size-4" />
      Board
    </button>
  );
}

function RoleToggle({
  role,
  onChange,
}: {
  role: Role;
  onChange: (r: Role) => void;
}) {
  const roles: Role[] = ["field", "office", "owner", "authority"];
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-gold">
        Who you are right now
      </p>
      <div className="chip-scroll">
        {roles.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onChange(r)}
            className={cn(
              "inline-flex min-h-10 items-center gap-1.5 rounded-full border px-3.5 text-sm font-medium transition-colors",
              role === r
                ? "border-transparent btn-sunrise text-accent-fg shadow-sm"
                : "border-border bg-surface-1 text-fg-muted",
            )}
          >
            {r === "field" ? (
              <HardHat className="size-3.5" />
            ) : r === "authority" ? (
              <Landmark className="size-3.5" />
            ) : r === "owner" ? (
              <Building2 className="size-3.5" />
            ) : (
              <User className="size-3.5" />
            )}
            {roleLabel(r)}
          </button>
        ))}
      </div>
      <p className="text-xs leading-relaxed text-fg-subtle text-pretty">
        {roleHelp(role)}
      </p>
    </div>
  );
}

function VisibilityMeter({
  meter,
  unseenCritical,
  unseenImportant,
}: {
  meter: number;
  unseenCritical: number;
  unseenImportant: number;
}) {
  const tone =
    meter >= 70 ? "high" : meter >= 35 ? "mid" : meter > 0 ? "low" : "clear";

  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        tone === "high"
          ? "border-disputed/40 bg-disputed/10"
          : tone === "mid"
            ? "border-unproven/40 bg-unproven/10"
            : tone === "low"
              ? "border-border bg-surface"
              : "border-supported/30 bg-supported/10",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-fg-subtle">
            Unseen high-priority
          </p>
          <p className="mt-1 text-sm font-medium text-fg text-pretty">
            {tone === "clear"
              ? "Stop-now and job-blocking items are marked seen"
              : "Keep stop-work and blocked items where desk and owner can see them"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant="p0">Stop-now: {unseenCritical}</Badge>
          <Badge variant="p1">Blocks-job: {unseenImportant}</Badge>
        </div>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-3">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            tone === "high"
              ? "bg-disputed"
              : tone === "mid"
                ? "bg-unproven"
                : tone === "low"
                  ? "bg-gold"
                  : "bg-supported",
          )}
          style={{ width: `${Math.max(meter, tone === "clear" ? 100 : meter)}%` }}
        />
      </div>
    </div>
  );
}

function ReadinessBanner({ jobsiteId }: { jobsiteId: string }) {
  const jobsite = useJobsiteStore((s) => s.jobsite);
  const ready = useMemo(() => evaluateReadiness(jobsite), [jobsite, jobsiteId]);

  return (
    <IntegrityNotice mode={ready.allClear ? "clean" : "hold"}>
      {ready.allClear ? (
        <p className="font-medium text-supported">
          All clear — no open stop-now (P0) and no failed inspections. A person
          still owns every status change.
        </p>
      ) : (
        <div className="space-y-1">
          <p className="font-medium text-disputed">
            All clear blocked — open gaps stay visible.
          </p>
          <ul className="list-inside list-disc text-xs text-fg-muted">
            {ready.blockers.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
    </IntegrityNotice>
  );
}

function FeedView() {
  const jobsite = useJobsiteStore((s) => s.jobsite);
  const role = useJobsiteStore((s) => s.role);
  const setRole = useJobsiteStore((s) => s.setRole);
  const setView = useJobsiteStore((s) => s.setView);
  const startNewProject = useJobsiteStore((s) => s.startNewProject);
  const [confirmBlank, setConfirmBlank] = useState(false);
  const reports = jobsite.reports;
  const messages = jobsite.messages;
  const inspections = jobsite.inspections;

  const openReports = reports.filter((r) => r.status !== "resolved").length;
  const openMsgs = messages.filter((m) => m.status === "sent").length;
  const openInsp = inspections.filter(
    (i) =>
      i.status === "scheduled" ||
      i.status === "requested" ||
      i.status === "ready_for_inspector",
  ).length;
  const unseenCritical = reports.filter(
    (r) => r.priority === "P0" && r.status === "open",
  ).length;
  const unseenImportant = reports.filter(
    (r) => r.priority === "P1" && r.status === "open",
  ).length;
  const meter = Math.min(100, unseenCritical * 35 + unseenImportant * 15);
  const activity = useMemo(() => buildActivityWire(jobsite), [jobsite]);
  const sorted = useMemo(() => sortReports(reports), [reports]);

  return (
    <div className="animate-enter space-y-5 sm:space-y-6">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 space-y-1.5">
            <span className="lpin-chip">
              <Zap className="size-3" />
              LPIN Suite · Jobsite
            </span>
            <h1 className="font-display text-2xl font-medium tracking-tight text-fg text-balance sm:text-3xl lg:text-4xl">
              Jobsite board
            </h1>
            <p className="text-sm text-fg-muted text-pretty">
              {jobsite.name}
              <span className="text-fg-subtle"> · {jobsite.location}</span>
            </p>
            <p className="text-xs text-fg-subtle text-pretty">
              Permit {jobsite.permitNumber}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button
              variant="secondary"
              size="sm"
              className="hidden sm:inline-flex"
              onClick={() => setView("project")}
            >
              <FolderOpen className="size-3.5" />
              {jobsite.isDemo ? "My jobsite" : "Jobsite"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0 sm:hidden"
              aria-label="Jobsite setup"
              onClick={() => setView("project")}
            >
              <FolderOpen className="size-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="shrink-0"
              aria-label="Jobsite setup"
              onClick={() => setView("project")}
            >
              <RotateCcw className="size-4" />
            </Button>
          </div>
        </div>
        <p className="text-sm leading-relaxed text-fg-muted text-pretty sm:max-w-xl">
          Phone-first for the crew. Full board on a computer in the trailer.
          File reports · message the building department lane · schedule
          inspections — wired so stop-work items stay on top. A person owns every
          status. United States · data stays on this device.
        </p>
      </header>

      <UsScopeBanner compact />
      {jobsite.isDemo ? (
        <div className="space-y-2 rounded-xl border border-unproven/30 bg-unproven/10 px-3 py-3 text-xs text-fg-muted text-pretty">
          <p>
            <strong className="font-medium text-unproven">Sample board.</strong>{" "}
            Walk the wired lanes, then start a blank jobsite for real work — or open{" "}
            <button
              type="button"
              className="font-medium text-gold underline-offset-2 hover:underline"
              onClick={() => setView("project")}
            >
              Jobsite setup
            </button>
            .
          </p>
          {!confirmBlank ? (
            <Button
              type="button"
              size="sm"
              className="w-full sm:w-auto"
              onClick={() => setConfirmBlank(true)}
            >
              Start blank jobsite
            </Button>
          ) : (
            <div
              className="space-y-2 rounded-lg border border-disputed/40 bg-disputed/10 p-3"
              role="alertdialog"
              aria-label="Confirm blank jobsite"
            >
              <p className="text-sm font-medium text-fg">
                Replace the sample board with a blank jobsite?
              </p>
              <p className="text-[11px] text-fg-muted">
                Sample reports and inspections will be cleared on this device.
                Export a pack first if you need a backup.
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    startNewProject({
                      name: "My jobsite",
                      location: "United States",
                      permitNumber: "TBD",
                      permittingOffice: "City / County Building Department",
                      stateCode: undefined,
                      cityState: undefined,
                    });
                    setConfirmBlank(false);
                    setView("project");
                  }}
                >
                  Yes — start blank jobsite
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => setConfirmBlank(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : null}
      <GlossaryStrip />
      <RoleToggle role={role} onChange={setRole} />
      <DesktopNav active="feed" />
      <ReadinessBanner jobsiteId={jobsite.id} />

      <div className="kpi-grid">
        <button type="button" className="kpi-card" onClick={() => setView("feed")}>
          <span className="kpi-value">{openReports}</span>
          <span className="kpi-label">Open reports</span>
        </button>
        <button
          type="button"
          className="kpi-card"
          onClick={() => setView("messages")}
        >
          <span className="kpi-value">{openMsgs}</span>
          <span className="kpi-label">Unread messages</span>
        </button>
        <button
          type="button"
          className="kpi-card"
          onClick={() => setView("inspections")}
        >
          <span className="kpi-value">{openInsp}</span>
          <span className="kpi-label">Upcoming inspections</span>
        </button>
        <button type="button" className="kpi-card" onClick={() => setView("desk")}>
          <span className="kpi-value">{unseenCritical + unseenImportant}</span>
          <span className="kpi-label">Need desk eyes</span>
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Button className="w-full" size="lg" onClick={() => setView("report")}>
          <Plus />
          File report
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => setView("schedule")}
        >
          <CalendarRange />
          Gantt schedule
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setView("contacts")}
        >
          <Users />
          Vendors
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setView("messages")}
        >
          <MessageSquare />
          Messages
        </Button>
      </div>

      <div className="dashboard-shell">
        <aside className="dashboard-rail space-y-4">
          <VisibilityMeter
            meter={meter}
            unseenCritical={unseenCritical}
            unseenImportant={unseenImportant}
          />
          <WiredLanesCompact />
          <section className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium text-fg">Activity wire</h2>
              <span className="text-[11px] text-gold">Live</span>
            </div>
            <div className="space-y-2">
              {activity.slice(0, 8).map((item) => (
                <ActivityRow key={item.id} item={item} />
              ))}
              {activity.length === 0 ? (
                <p className="text-xs text-fg-subtle">No activity yet.</p>
              ) : null}
            </div>
          </section>
          <HarborRulesCard compact title="Working rules" />
        </aside>

        <div className="dashboard-main space-y-4">
          <section className="space-y-3">
            <h2 className="text-sm font-medium text-fg">
              Priority stack
              <span className="ml-2 text-xs font-normal text-fg-subtle">
                highest first
              </span>
            </h2>
            {sorted.length === 0 ? (
              <EmptyFeed onCompose={() => setView("report")} />
            ) : (
              sorted.map((r, i) => (
                <ReportCard key={r.id} report={r} index={i} showActions />
              ))
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

function WiredLanesCompact() {
  const setView = useJobsiteStore((s) => s.setView);
  const lanes = [
    {
      id: "report" as const,
      title: "Field report",
      hint: "Priority + body",
      icon: <ClipboardList className="size-4" />,
    },
    {
      id: "messages" as const,
      title: "Department messages",
      hint: "Two-way office",
      icon: <MessageSquare className="size-4" />,
    },
    {
      id: "inspections" as const,
      title: "Inspections",
      hint: "Schedule + status",
      icon: <CalendarClock className="size-4" />,
    },
  ];
  return (
    <section className="space-y-2">
      <p className="flex items-center gap-1.5 text-xs font-medium text-fg-muted">
        <Link2 className="size-3.5 text-gold" />
        Wired lanes
      </p>
      <div className="space-y-2">
        {lanes.map((lane) => (
          <button
            key={lane.id}
            type="button"
            onClick={() => setView(lane.id)}
            className="card-lpin flex min-h-14 w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:border-[color-mix(in_oklab,var(--color-gold)_35%,var(--color-border))]"
          >
            <span className="lpin-icon !h-10 !w-10">{lane.icon}</span>
            <span className="min-w-0">
              <span className="block text-sm font-medium text-fg">
                {lane.title}
              </span>
              <span className="block text-xs text-fg-subtle">{lane.hint}</span>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const setView = useJobsiteStore((s) => s.setView);
  const target: JobsiteView =
    item.kind === "message"
      ? "messages"
      : item.kind === "inspection"
        ? "inspections"
        : "desk";
  return (
    <button
      type="button"
      onClick={() => setView(target)}
      className="flex w-full min-h-14 items-start gap-3 rounded-xl border border-border bg-surface-1 px-3 py-3 text-left transition-colors hover:border-[color-mix(in_oklab,var(--color-gold)_30%,var(--color-border))] active:bg-surface-2"
    >
      <span className="lpin-icon !h-8 !w-8 !rounded-lg [&_svg]:size-3.5">
        {item.kind === "message" ? (
          <MessageSquare />
        ) : item.kind === "inspection" ? (
          <CalendarClock />
        ) : (
          <CircleDot />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <span className="text-sm font-medium text-fg text-pretty">
            {item.title}
          </span>
          {item.wired ? (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-gold">
              <Radio className="size-2.5" />
              Wired
            </span>
          ) : null}
          {item.priority ? (
            <Badge
              variant={
                item.priority === "P0"
                  ? "p0"
                  : item.priority === "P1"
                    ? "p1"
                    : "default"
              }
            >
              {item.priority}
            </Badge>
          ) : null}
        </span>
        <span className="mt-0.5 block text-[11px] text-fg-subtle text-pretty">
          {item.statusLabel} · {item.detail}
        </span>
      </span>
    </button>
  );
}

function GlossaryStrip() {
  return (
    <details className="card-lpin rounded-xl">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-fg-muted [&::-webkit-details-marker]:hidden">
        <Info className="size-4 shrink-0 text-gold" />
        Plain-language key + field rules
      </summary>
      <ul className="space-y-2 border-t border-border px-4 py-3 text-xs leading-relaxed text-fg-muted">
        <li>
          <strong className="text-fg">Active reporting</strong> — Live field
          updates with priority, not end-of-day paperwork only.
        </li>
        <li>
          <strong className="text-fg">Wired</strong> — One action creates a
          record in another lane (report → message, inspection → message).
        </li>
        {JOBSITE_KERNEL_LINES.map((line) => (
          <li key={line} className="text-pretty">
            {line}
          </li>
        ))}
        <li>
          <strong className="text-fg">Building department</strong> — City/county
          desk that issues permits and sends inspectors (team copy on this board).
        </li>
        <li>
          <strong className="text-fg">MEP / rough-in</strong> — Mechanical,
          electrical, plumbing inspection before walls close.
        </li>
        <li>
          <strong className="text-fg">Project pack</strong> — Open{" "}
          <code className="text-gold">.lpin-jobsite.json</code> file you can
          export/import between devices.
        </li>
      </ul>
    </details>
  );
}

function ReportCard({
  report,
  index,
  showActions,
}: {
  report: FieldReport;
  index: number;
  showActions?: boolean;
}) {
  const markSeen = useJobsiteStore((s) => s.markSeen);
  const resolveReport = useJobsiteStore((s) => s.resolveReport);
  const reopenReport = useJobsiteStore((s) => s.reopenReport);
  const messageAboutReport = useJobsiteStore((s) => s.messageAboutReport);
  const setView = useJobsiteStore((s) => s.setView);
  const role = useJobsiteStore((s) => s.role);

  return (
    <article
      className={cn(
        "card-lpin rounded-2xl p-4",
        report.priority === "P0" && report.status !== "resolved"
          ? "!border-disputed/40"
          : "",
      )}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={
            report.priority === "P0"
              ? "p0"
              : report.priority === "P1"
                ? "p1"
                : report.priority === "P2"
                  ? "p2"
                  : "p3"
          }
        >
          {report.priority} · {priorityTitle(report.priority)}
        </Badge>
        <Badge variant="default">{statusLabel(report.status)}</Badge>
        <Badge variant="default">{categoryLabel(report.category)}</Badge>
        {report.sendToAuthority ? (
          <span className="inline-flex items-center gap-1 text-gold">
            <Radio className="size-3" />
            <span className="text-[10px] font-medium">Wired</span>
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 text-base font-medium text-fg text-pretty">
        {report.title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-fg-muted text-pretty">
        {report.body}
      </p>
      {report.photos && report.photos.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {report.photos.map((p) => (
            <a
              key={p.id}
              href={p.dataUrl}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-lg border border-border"
            >
              <img
                src={p.dataUrl}
                alt={p.caption || "Field photo"}
                className="h-20 w-28 object-cover"
              />
            </a>
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-xs text-fg-subtle">
        {report.authorName} · {roleLabel(report.authorRole)} ·{" "}
        {urgencyLabel(report.urgency)} · {formatWhen(report.createdAt)}
      </p>
      <p className="mt-1 text-[11px] text-fg-subtle text-pretty">
        {priorityHelp(report.priority)}
      </p>
      {showActions ? (
        <div className="mt-3 flex flex-wrap gap-2">
          {report.status === "open" &&
          (role === "office" || role === "owner" || role === "authority") ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                markSeen(report.id);
                toast.success("Marked seen by desk.");
              }}
            >
              <CheckCheck className="size-3.5" />
              Mark seen
            </Button>
          ) : null}
          {report.status !== "resolved" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                resolveReport(report.id);
                toast.message("Report closed by a person.");
              }}
            >
              Close
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                reopenReport(report.id);
                toast.message("Report reopened.");
              }}
            >
              Reopen
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              messageAboutReport(report.id);
              setView("messages");
            }}
          >
            <Send className="size-3.5" />
            Message office
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              try {
                printReport(useJobsiteStore.getState().jobsite, report);
                toast.message("Print field note — Save as PDF.");
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Print failed.");
              }
            }}
          >
            <Printer className="size-3.5" />
            Print note
          </Button>
        </div>
      ) : null}
    </article>
  );
}

function EmptyFeed({ onCompose }: { onCompose: () => void }) {
  return (
    <div className="card-lpin rounded-2xl border-dashed px-6 py-12 text-center">
      <Shield className="mx-auto size-8 text-gold" />
      <p className="mt-3 text-sm font-medium text-fg">No field reports yet</p>
      <p className="mt-1 text-xs text-fg-muted text-pretty">
        File the first one so stop-now problems never hide under a green board.
      </p>
      <Button className="mt-4" onClick={onCompose}>
        <Plus />
        File report
      </Button>
    </div>
  );
}

function ReportView() {
  const addReport = useJobsiteStore((s) => s.addReport);
  const role = useJobsiteStore((s) => s.role);
  const setView = useJobsiteStore((s) => s.setView);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [priority, setPriority] = useState<Priority>("P1");
  const [urgency, setUrgency] = useState<Urgency>("today");
  const [category, setCategory] = useState<ReportCategory>("safety");
  const [authorName, setAuthorName] = useState("Field super");
  const [sendToAuthority, setSendToAuthority] = useState(true);
  const [alsoInspect, setAlsoInspect] = useState(false);
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [inspType, setInspType] = useState("Rough-in (MEP)");
  const [inspDate, setInspDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 2);
    return d.toISOString().slice(0, 10);
  });
  const [inspWindow, setInspWindow] = useState("8am–12pm");
  const [inspArea, setInspArea] = useState("Building A — 2nd floor");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) {
      toast.error("Title and details are required.");
      return;
    }
    addReport({
      title: title.trim(),
      body: body.trim(),
      priority,
      urgency,
      category,
      authorName: authorName.trim() || "Field",
      sendToAuthority,
      photos: photos.length ? photos : undefined,
      alsoRequestInspection: alsoInspect
        ? {
            typeLabel: inspType,
            scheduledDate: inspDate,
            timeWindow: inspWindow,
            buildingArea: inspArea,
          }
        : undefined,
    });
    toast.success(
      sendToAuthority
        ? "Report filed and wired to the department lane."
        : "Report filed on the jobsite board.",
    );
    setView("feed");
  }

  return (
    <div className="animate-enter space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <BackToFeed />
        <h1 className="font-display text-2xl font-medium tracking-tight text-fg">
          File a field report
        </h1>
        <p className="text-sm text-fg-muted text-pretty">
          Priority first. Wire to the building department lane when they need
          eyes. A person owns every status — software does not auto-close
          stop-now items.
        </p>
      </div>
      <DesktopNav active="report" />
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="card-lpin space-y-4 rounded-2xl p-4 sm:p-6">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">Title</span>
            <input
              className="field-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Short problem title"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">Details</span>
            <textarea
              className="field-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What happened, where, and what is blocked"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">Your name</span>
            <input
              className="field-input"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </label>
          <div>
            <p className="mb-2 text-sm font-medium text-fg-muted">Priority</p>
            <div className="grid grid-cols-2 gap-2">
              {(["P0", "P1", "P2", "P3"] as Priority[]).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    "min-h-14 rounded-xl border px-3 py-2 text-left transition-colors",
                    priority === p
                      ? "border-[color-mix(in_oklab,var(--color-gold)_40%,var(--color-border))] bg-surface-2 text-fg"
                      : "border-border bg-surface-1 text-fg-muted",
                  )}
                >
                  <span className="block text-sm font-semibold">{p}</span>
                  <span className="block text-[11px] opacity-80">
                    {priorityTitle(p)}
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-2 text-xs text-fg-subtle text-pretty">
              {priorityHelp(priority)}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-fg-muted">Urgency</span>
              <select
                className="field-input"
                value={urgency}
                onChange={(e) => setUrgency(e.target.value as Urgency)}
              >
                <option value="immediate">Right now</option>
                <option value="today">Today</option>
                <option value="this_week">This week</option>
                <option value="whenever">When you can</option>
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-fg-muted">Category</span>
              <select
                className="field-input"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ReportCategory)
                }
              >
                <option value="safety">Safety</option>
                <option value="permit">Permit / code</option>
                <option value="inspection">Inspection</option>
                <option value="materials">Materials</option>
                <option value="weather">Weather / access</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-fg-muted">
                Photos (optional)
              </span>
              <span className="text-[11px] text-fg-subtle">
                {photos.length}/{MAX_PHOTOS_PER_REPORT} · stays on device
              </span>
            </div>
            {photos.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {photos.map((p) => (
                  <div key={p.id} className="relative">
                    <img
                      src={p.dataUrl}
                      alt={p.caption || "Field photo"}
                      className="h-20 w-28 rounded-lg border border-border object-cover"
                    />
                    <button
                      type="button"
                      className="absolute -right-1.5 -top-1.5 flex size-6 items-center justify-center rounded-full bg-disputed text-white"
                      aria-label="Remove photo"
                      onClick={() =>
                        setPhotos((prev) => prev.filter((x) => x.id !== p.id))
                      }
                    >
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
            {photos.length < MAX_PHOTOS_PER_REPORT ? (
              <label className="flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-1 px-3 text-sm font-medium text-fg-muted">
                <ImagePlus className="size-4 text-gold" />
                {photoBusy ? "Compressing…" : "Add photo from camera or gallery"}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  disabled={photoBusy}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    e.target.value = "";
                    if (!file) return;
                    setPhotoBusy(true);
                    void fileToReportPhoto(file)
                      .then((p) => {
                        setPhotos((prev) =>
                          prev.length >= MAX_PHOTOS_PER_REPORT
                            ? prev
                            : [...prev, p],
                        );
                        toast.success("Photo attached.");
                      })
                      .catch(() => toast.error("Could not read that photo."))
                      .finally(() => setPhotoBusy(false));
                  }}
                />
              </label>
            ) : null}
          </div>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-surface-1 px-3">
            <input
              type="checkbox"
              className="size-5 accent-[var(--color-gold)]"
              checked={sendToAuthority}
              onChange={(e) => setSendToAuthority(e.target.checked)}
            />
            <span className="text-sm text-fg text-pretty">
              Wire to building department lane (creates a message on this board)
            </span>
          </label>
          <label className="flex min-h-12 items-center gap-3 rounded-xl border border-border bg-surface-1 px-3">
            <input
              type="checkbox"
              className="size-5 accent-[var(--color-gold)]"
              checked={alsoInspect}
              onChange={(e) => setAlsoInspect(e.target.checked)}
            />
            <span className="text-sm text-fg text-pretty">
              Also request an inspection (wired)
            </span>
          </label>
          {alsoInspect ? (
            <div className="space-y-3 rounded-xl border border-border bg-surface-1 p-3">
              <label className="block space-y-1">
                <span className="text-xs text-fg-subtle">Inspection type</span>
                <input
                  className="field-input"
                  value={inspType}
                  onChange={(e) => setInspType(e.target.value)}
                />
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="block space-y-1">
                  <span className="text-xs text-fg-subtle">Date</span>
                  <input
                    type="date"
                    className="field-input"
                    value={inspDate}
                    onChange={(e) => setInspDate(e.target.value)}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-xs text-fg-subtle">Time window</span>
                  <input
                    className="field-input"
                    value={inspWindow}
                    onChange={(e) => setInspWindow(e.target.value)}
                  />
                </label>
              </div>
              <label className="block space-y-1">
                <span className="text-xs text-fg-subtle">Building area</span>
                <input
                  className="field-input"
                  value={inspArea}
                  onChange={(e) => setInspArea(e.target.value)}
                />
              </label>
            </div>
          ) : null}
          <p className="text-xs text-fg-subtle text-pretty">
            Filing as {roleLabel(role)}. Priority P0 blocks “all clear” until a
            person closes it.
          </p>
        </div>
        <div className="sticky-action-bar">
          <Button type="submit" size="lg" className="w-full">
            <Send />
            Submit report
          </Button>
        </div>
      </form>
    </div>
  );
}

function MessagesView() {
  const jobsite = useJobsiteStore((s) => s.jobsite);
  const role = useJobsiteStore((s) => s.role);
  const sendMessage = useJobsiteStore((s) => s.sendMessage);
  const markMessageRead = useJobsiteStore((s) => s.markMessageRead);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("Project desk");
  const [direction, setDirection] = useState<MessageDirection>(
    "field_to_authority",
  );
  const sorted = useMemo(
    () =>
      [...jobsite.messages].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [jobsite.messages],
  );

  useEffect(() => {
    if (role === "authority") setDirection("authority_to_field");
    else if (role === "office" || role === "owner")
      setDirection("office_to_authority");
    else setDirection("field_to_authority");
  }, [role]);

  function onSend(e: React.FormEvent) {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) {
      toast.error("Subject and message body are required.");
      return;
    }
    sendMessage({
      subject: subject.trim(),
      body: body.trim(),
      direction,
      authorName: authorName.trim() || "Crew",
    });
    setSubject("");
    setBody("");
    toast.success("Message sent on the board.");
  }

  return (
    <div className="animate-enter space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <BackToFeed />
        <h1 className="font-display text-2xl font-medium tracking-tight text-fg">
          Building department messages
        </h1>
        <p className="text-sm text-fg-muted text-pretty">
          Two-way field ↔ building department{" "}
          <em className="not-italic text-fg-subtle">(team copy on this board)</em>
          . <span className="text-gold">Wired</span> = auto from report or
          inspection — still a person writes freeform replies. Not a city portal.
        </p>
      </div>
      <DesktopNav active="messages" />

      <form onSubmit={onSend} className="space-y-3">
        <div className="card-lpin space-y-4 rounded-2xl p-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">Direction</span>
            <select
              className="field-input"
              value={direction}
              onChange={(e) =>
                setDirection(e.target.value as MessageDirection)
              }
            >
              <option value="field_to_authority">
                Jobsite → Building department
              </option>
              <option value="authority_to_field">
                Building department → Jobsite
              </option>
              <option value="office_to_authority">
                Office → Building department
              </option>
              <option value="internal">Internal note</option>
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">Your name</span>
            <input
              className="field-input"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">Subject</span>
            <input
              className="field-input"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">Message</span>
            <textarea
              className="field-input"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </label>
          <Button type="submit" className="w-full">
            <Send />
            Send message
          </Button>
        </div>
      </form>

      <section className="space-y-3">
        {sorted.map((m) => (
          <MessageCard
            key={m.id}
            message={m}
            onRead={() => markMessageRead(m.id)}
          />
        ))}
        {sorted.length === 0 ? (
          <p className="text-sm text-fg-subtle">No messages yet.</p>
        ) : null}
      </section>
    </div>
  );
}

function MessageCard({
  message,
  onRead,
}: {
  message: AuthorityMessage;
  onRead: () => void;
}) {
  return (
    <article
      className={cn(
        "card-lpin rounded-2xl p-4",
        message.status === "sent" ? "border-gold/20" : "",
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="default">
          {messageDirectionLabel(message.direction)}
        </Badge>
        {message.wiredFrom ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-gold">
            <Radio className="size-2.5" />
            Wired · {message.wiredFrom}
          </span>
        ) : null}
        <span className="text-xs text-fg-subtle">
          {formatWhen(message.createdAt)}
        </span>
      </div>
      <h3 className="mt-2 text-sm font-medium text-fg text-pretty">
        {message.subject}
      </h3>
      <p className="mt-1 text-sm text-fg-muted text-pretty">{message.body}</p>
      <p className="mt-2 text-xs text-fg-subtle">
        {message.authorName} · {roleLabel(message.authorRole)} ·{" "}
        {message.status === "sent"
          ? "Delivered"
          : message.status === "read"
            ? "Read"
            : "Replied"}
      </p>
      {message.status === "sent" ? (
        <button
          type="button"
          onClick={onRead}
          className="mt-2 min-h-10 text-sm font-medium text-gold"
        >
          Mark read
        </button>
      ) : null}
    </article>
  );
}

function InspectionsView() {
  const jobsite = useJobsiteStore((s) => s.jobsite);
  const requestInspection = useJobsiteStore((s) => s.requestInspection);
  const updateInspectionStatus = useJobsiteStore(
    (s) => s.updateInspectionStatus,
  );
  const sorted = useMemo(
    () => sortInspections(jobsite.inspections),
    [jobsite.inspections],
  );
  const [typeLabel, setTypeLabel] = useState("Rough-in (MEP)");
  const [scheduledDate, setScheduledDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().slice(0, 10);
  });
  const [timeWindow, setTimeWindow] = useState("8am–12pm");
  const [buildingArea, setBuildingArea] = useState("Building A");
  const [notes, setNotes] = useState("");
  const [requestedBy, setRequestedBy] = useState("Field super");

  function onRequest(e: React.FormEvent) {
    e.preventDefault();
    requestInspection({
      typeLabel,
      scheduledDate,
      timeWindow,
      buildingArea,
      notes,
      requestedBy,
    });
    toast.success("Inspection requested and wired to the department lane.");
  }

  return (
    <div className="animate-enter space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <BackToFeed />
        <h1 className="font-display text-2xl font-medium tracking-tight text-fg">
          Inspection schedule
        </h1>
        <p className="text-sm text-fg-muted text-pretty">
          Status changes wire messages so the field and building department
          stay aligned. Failed inspections block “all clear.”
        </p>
      </div>
      <DesktopNav active="inspections" />

      <form onSubmit={onRequest}>
        <div className="card-lpin space-y-4 rounded-2xl p-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">Type</span>
            <input
              className="field-input"
              value={typeLabel}
              onChange={(e) => setTypeLabel(e.target.value)}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-fg-muted">Date</span>
              <input
                type="date"
                className="field-input"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-fg-muted">Window</span>
              <input
                className="field-input"
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value)}
              />
            </label>
          </div>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">Area</span>
            <input
              className="field-input"
              value={buildingArea}
              onChange={(e) => setBuildingArea(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">
              Requested by
            </span>
            <input
              className="field-input"
              value={requestedBy}
              onChange={(e) => setRequestedBy(e.target.value)}
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">Notes</span>
            <textarea
              className="field-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
          <Button type="submit" className="w-full">
            <CalendarClock />
            Request inspection
          </Button>
        </div>
      </form>

      <section className="space-y-3">
        {sorted.map((insp) => (
          <InspectionCard
            key={insp.id}
            inspection={insp}
            onStatus={(s) => {
              updateInspectionStatus(insp.id, s);
              toast.message(`Inspection → ${inspectionStatusLabel(s)}`);
            }}
          />
        ))}
        {sorted.length === 0 ? (
          <p className="text-sm text-fg-subtle">No inspections scheduled.</p>
        ) : null}
      </section>
    </div>
  );
}

function InspectionCard({
  inspection,
  onStatus,
}: {
  inspection: Inspection;
  onStatus: (s: InspectionStatus) => void;
}) {
  const statuses: InspectionStatus[] = [
    "requested",
    "scheduled",
    "ready_for_inspector",
    "passed",
    "failed",
    "cancelled",
  ];
  return (
    <article className="card-lpin rounded-2xl p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          variant={
            inspection.status === "failed"
              ? "disputed"
              : inspection.status === "passed"
                ? "supported"
                : "honesty"
          }
        >
          {inspectionStatusLabel(inspection.status)}
        </Badge>
        <span className="text-xs text-fg-subtle">
          {formatDateLabel(inspection.scheduledDate)} · {inspection.timeWindow}
        </span>
      </div>
      <h3 className="mt-2 text-sm font-medium text-fg">{inspection.typeLabel}</h3>
      <p className="mt-1 text-xs text-fg-muted text-pretty">
        {inspection.buildingArea} · {inspection.authorityOffice}
      </p>
      <p className="mt-1 text-xs text-fg-subtle text-pretty">
        {inspectionStatusHelp(inspection.status)}
      </p>
      {inspection.notes ? (
        <p className="mt-2 text-sm text-fg-muted text-pretty">
          {inspection.notes}
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => onStatus(s)}
            className={cn(
              "min-h-9 rounded-lg border px-2.5 text-[11px] font-medium",
              inspection.status === s
                ? "border-[color-mix(in_oklab,var(--color-gold)_40%,var(--color-border))] bg-surface-2 text-fg"
                : "border-border bg-surface-1 text-fg-muted",
            )}
          >
            {inspectionStatusLabel(s)}
          </button>
        ))}
      </div>
    </article>
  );
}

function DeskView() {
  const jobsite = useJobsiteStore((s) => s.jobsite);
  const setView = useJobsiteStore((s) => s.setView);
  const reports = jobsite.reports;
  const sorted = useMemo(() => sortReports(reports), [reports]);
  const needsSeen = sorted.filter(
    (r) =>
      (r.priority === "P0" || r.priority === "P1") && r.status === "open",
  );
  const rest = sorted.filter((r) => !needsSeen.includes(r));
  const unseenCritical = reports.filter(
    (r) => r.priority === "P0" && r.status === "open",
  ).length;
  const unseenImportant = reports.filter(
    (r) => r.priority === "P1" && r.status === "open",
  ).length;
  const ready = useMemo(() => evaluateReadiness(jobsite), [jobsite]);
  const summary = useMemo(() => buildDeskSummary(jobsite), [jobsite]);
  const [copied, setCopied] = useState(false);

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(summary);
      setCopied(true);
      toast.success("Desk summary copied.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select text manually.");
    }
  }

  function printPacket() {
    try {
      openPrintPacket(buildPrintHtml(jobsite), `Jobsite — ${jobsite.name}`);
      toast.message("Print dialog — Save as PDF for a file.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Print failed.");
    }
  }

  function exportPack() {
    try {
      downloadPack(jobsite);
      toast.success("Project pack downloaded.");
    } catch {
      toast.error("Export failed.");
    }
  }

  async function copyFullPacket() {
    try {
      await navigator.clipboard.writeText(buildReadinessPacket(jobsite));
      toast.success("Full readiness packet copied.");
    } catch {
      toast.error("Could not copy.");
    }
  }

  function emailSummary() {
    window.location.href = buildMailtoHref(jobsite, summary);
  }

  return (
    <div className="animate-enter space-y-4 sm:space-y-6">
      <div className="space-y-2">
        <BackToFeed />
        <h1 className="font-display text-2xl font-medium tracking-tight text-fg lg:text-3xl">
          Office reporting desk
        </h1>
        <p className="text-sm text-fg-muted text-pretty">
          Mark high-priority reports{" "}
          <strong className="font-medium text-fg">seen</strong> so the team
          knows a person has eyes on them. “All clear” stays blocked while
          stop-now gaps remain.
        </p>
      </div>

      <DesktopNav active="desk" />
      <ReadinessBanner jobsiteId={jobsite.id} />

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-value text-disputed">{unseenCritical}</span>
          <span className="kpi-label">Stop-now open (P0)</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value text-unproven">{unseenImportant}</span>
          <span className="kpi-label">Blocks-job open (P1)</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{needsSeen.length}</span>
          <span className="kpi-label">Need mark-seen</span>
        </div>
        <div className="kpi-card">
          <span
            className={cn(
              "kpi-value",
              ready.allClear ? "text-supported" : "text-disputed",
            )}
          >
            {ready.allClear ? "OK" : "Hold"}
          </span>
          <span className="kpi-label">All-clear gate</span>
        </div>
      </div>

      <VisibilityMeter
        meter={Math.min(100, unseenCritical * 35 + unseenImportant * 15)}
        unseenCritical={unseenCritical}
        unseenImportant={unseenImportant}
      />

      <div className="card-lpin space-y-3 rounded-2xl p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-medium text-fg">Desk handoff</p>
          <Button size="sm" variant="ghost" onClick={() => setView("project")}>
            <FolderOpen className="size-3.5" />
            Jobsite
          </Button>
        </div>
        <p className="text-xs text-fg-muted text-pretty">
          Copy, print/PDF, email, or download an open project pack for another
          device. Team board only — not a city portal login.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="secondary" onClick={() => void copySummary()}>
            {copied ? <CheckCheck className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy summary"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void copyFullPacket()}>
            <Copy className="size-3.5" />
            Full packet
          </Button>
          <Button size="sm" variant="outline" onClick={() => {
            try {
              printBoard(jobsite);
              toast.message("Print board — Save as PDF.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Print failed.");
            }
          }}>
            <Printer className="size-3.5" />
            Print board
          </Button>
          <Button size="sm" variant="outline" onClick={() => {
            try {
              printFullProject(jobsite);
              toast.message("Full project packet — Save as PDF.");
            } catch (err) {
              toast.error(err instanceof Error ? err.message : "Print failed.");
            }
          }}>
            <Printer className="size-3.5" />
            Full packet
          </Button>
          <Button size="sm" variant="outline" onClick={emailSummary}>
            <Mail className="size-3.5" />
            Email
          </Button>
          <Button size="sm" variant="outline" onClick={exportPack}>
            <Camera className="size-3.5" />
            Export pack
          </Button>
        </div>
        <pre className="max-h-48 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-surface-1 p-3 font-mono text-[11px] leading-relaxed text-fg-muted">
          {summary}
        </pre>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-fg">
            Needs mark-seen first
            <span className="ml-2 text-xs font-normal tabular-nums text-fg-subtle">
              {needsSeen.length}
            </span>
          </h2>
          {needsSeen.length === 0 ? (
            <p className="rounded-xl border border-supported/30 bg-supported/10 px-4 py-3 text-sm text-supported">
              No open stop-now or job-blocking items awaiting mark-seen.
            </p>
          ) : (
            needsSeen.map((r, i) => (
              <ReportCard key={r.id} report={r} index={i} showActions />
            ))
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-fg-muted">
            Rest of the stack
          </h2>
          {rest.length === 0 ? (
            <p className="text-sm text-fg-subtle">Nothing else in the stack.</p>
          ) : (
            rest.map((r, i) => (
              <ReportCard key={r.id} report={r} index={i} showActions />
            ))
          )}
        </section>
      </div>

      <HarborRulesCard compact title="Working rules" />
    </div>
  );
}
