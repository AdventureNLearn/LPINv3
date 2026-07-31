import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CalendarDays,
  Camera,
  CheckCircle2,
  ClipboardList,
  CloudSun,
  Filter,
  FolderCog,
  HardHat,
  ImagePlus,
  LayoutGrid,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Send,
  ShieldAlert,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { ProjectSetupPanel } from "@/components/jobsite/ProjectSetupPanel";
import { SiteMapPanel } from "@/components/jobsite/SiteMapPanel";
import { IntegrityNotice } from "@/components/integrity/HarborRules";
import { Button } from "@/components/ui/button";
import {
  fetchJobsiteWeather,
  type JobsiteWeather,
} from "@/lib/jobsite/free-weather";
import {
  fileToCompressedDataUrl,
  MAX_ATTACH_PER_REPORT,
  sourceFromInput,
} from "@/lib/jobsite/photo";
import {
  canAllClear,
  openAckCount,
  openP0Count,
  sortedReports,
  useJobsiteStore,
} from "@/lib/jobsite/store";
import type {
  FieldComm,
  FieldReport,
  InspectionStatus,
  LogLane,
  MobileTab,
  PhotoNote,
  Priority,
  ProjectContact,
  ReportCategory,
  RoleLens,
} from "@/lib/jobsite/types";
import { ROLE_OPTIONS, roleAuthorName } from "@/lib/jobsite/types";
import { todayYmd } from "@/lib/jobsite/us-states";
import { cn, formatRelative } from "@/lib/utils";

const TABS: {
  id: MobileTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "board", label: "Board", icon: LayoutGrid },
  { id: "log", label: "Log", icon: ClipboardList },
  { id: "plan", label: "Plan", icon: CalendarDays },
  { id: "map", label: "Map", icon: MapPin },
  { id: "setup", label: "Setup", icon: FolderCog },
];

const PRIORITY_STYLE: Record<Priority, string> = {
  P0: "border-disputed/50 bg-disputed/15 text-disputed",
  P1: "border-unproven/45 bg-unproven/12 text-unproven",
  P2: "border-sky/40 bg-sky/10 text-sky",
  P3: "border-border-strong bg-surface-2 text-fg-muted",
};

const ROLE_LABEL: Record<RoleLens, string> = {
  field: "Jobsite crew",
  office: "Office desk",
  owner: "Owner",
  authority: "Authority",
};

function scrollTabTop() {
  const el = document.getElementById("lpin-scroll-root");
  if (el) el.scrollTo({ top: 0, behavior: "smooth" });
  else window.scrollTo({ top: 0, behavior: "smooth" });
}

export function MobileJobsiteShell() {
  const tab = useJobsiteStore((s) => s.tab);
  const setTab = useJobsiteStore((s) => s.setTab);
  const project = useJobsiteStore((s) => s.project);
  const role = useJobsiteStore((s) => s.role);
  const setRole = useJobsiteStore((s) => s.setRole);
  const p0 = openP0Count(project);
  const acks = openAckCount(project);
  const clear = canAllClear(project);

  useEffect(() => {
    scrollTabTop();
  }, [tab]);

  return (
    <AppShell
      active="jobsite"
      edition="mobile"
      hideFooter
      mobileNav={
        <nav
          className="bottom-nav"
          style={{ ["--bottom-nav-cols" as string]: 5 }}
          aria-label="Jobsite sections"
        >
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const badge =
              t.id === "board" && p0 > 0
                ? p0
                : t.id === "log"
                  ? acks > 0
                    ? acks
                    : project.messages.length
                  : t.id === "setup" && project.isDemo
                    ? 1
                    : 0;
            return (
              <button
                key={t.id}
                type="button"
                className="bottom-nav-item"
                data-active={active ? "true" : "false"}
                aria-current={active ? "page" : undefined}
                onClick={() => setTab(t.id)}
              >
                <span className="relative">
                  <Icon className="size-5" />
                  {badge > 0 ? (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-disputed px-1 text-[10px] font-bold text-fg">
                      {badge > 9 ? "9+" : badge}
                    </span>
                  ) : null}
                </span>
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>
      }
    >
      <main className="mobile-content mx-auto w-full max-w-lg px-3 pt-3 sm:max-w-2xl sm:px-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="lpin-chip">
            <HardHat className="size-3" />
            Jobsite · field
          </span>
          <span className="text-[10px] uppercase tracking-wider text-fg-subtle">
            {project.permitNumber}
            {project.stateCode ? ` · ${project.stateCode}` : ""}
          </span>
        </div>

        <header className="mb-3 space-y-1">
          <h1 className="font-display text-2xl font-medium tracking-tight text-fg">
            {tab === "board"
              ? "Priority board"
              : tab === "log"
                ? "Comms log"
                : tab === "plan"
                  ? "Plan & materials"
                  : tab === "map"
                    ? "Site map"
                    : "Project setup"}
          </h1>
          <p className="text-sm text-fg-muted text-pretty">
            {project.name}
            <span className="text-fg-subtle">
              {" "}
              · {project.location}
              {project.cityState ? ` · ${project.cityState}` : ""}
            </span>
          </p>
        </header>

        <RoleLensStrip role={role} onChange={setRole} className="mb-4" />

        {(tab === "board" || tab === "log") && (
          <IntegrityNotice mode={clear ? "clean" : "hold"} className="mb-4">
            {clear ? (
              <>
                No open <strong className="text-fg">P0</strong>. A person still
                owns every status — not automated all-clear.
              </>
            ) : (
              <>
                <strong className="text-fg">{p0} open P0</strong> on the board
                {acks > 0 ? (
                  <>
                    {" "}
                    · <strong className="text-fg">{acks} acks due</strong> in
                    field log
                  </>
                ) : null}
                . Stop-work / life-safety stay on top.
              </>
            )}
          </IntegrityNotice>
        )}

        {tab === "board" && <BoardTab />}
        {tab === "log" && <LogTab />}
        {tab === "plan" && <PlanTab />}
        {tab === "map" && <MapTab />}
        {tab === "setup" && <ProjectSetupPanel />}
      </main>
    </AppShell>
  );
}

function RoleLensStrip({
  role,
  onChange,
  className,
  compact,
}: {
  role: RoleLens;
  onChange: (r: RoleLens) => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {!compact ? (
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-fg-subtle">
          Filing as · {ROLE_LABEL[role]}
        </p>
      ) : null}
      <div
        className="grid grid-cols-4 gap-1.5"
        role="radiogroup"
        aria-label="Role lens for metadata"
      >
        {ROLE_OPTIONS.map((opt) => {
          const active = role === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.id)}
              className={cn(
                "min-h-11 rounded-xl border px-1.5 py-2 text-center text-[11px] font-semibold leading-tight sm:text-xs",
                active
                  ? "border-[color-mix(in_oklab,var(--color-gold)_50%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-gold)_16%,var(--color-surface-2))] text-gold"
                  : "border-border bg-surface-1 text-fg-muted",
              )}
            >
              {opt.short}
            </button>
          );
        })}
      </div>
      {!compact ? (
        <p className="text-[11px] text-fg-subtle text-pretty">
          Role stamps author on reports, photo notes, and BD messages. Not a
          city login.
        </p>
      ) : null}
    </div>
  );
}

function BoardTab() {
  const project = useJobsiteStore((s) => s.project);
  const markReport = useJobsiteStore((s) => s.markReport);
  const role = useJobsiteStore((s) => s.role);
  const setTab = useJobsiteStore((s) => s.setTab);
  const setSetupSection = useJobsiteStore((s) => s.setSetupSection);
  const reports = useMemo(() => sortedReports(project), [project]);
  const [composer, setComposer] = useState(false);
  const [photoComposer, setPhotoComposer] = useState(false);
  const [filter, setFilter] = useState<"open" | "all" | "P0">("open");
  const [wx, setWx] = useState<JobsiteWeather | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchJobsiteWeather("United States").then((w) => {
      if (alive && w) setWx(w);
    });
    return () => {
      alive = false;
    };
  }, []);

  const shown = reports.filter((r) => {
    if (filter === "P0") return r.priority === "P0";
    if (filter === "open") return r.status !== "resolved";
    return true;
  });

  const photos = project.photos ?? [];

  return (
    <div className="space-y-4 animate-enter">
      {project.isDemo ? (
        <div className="rounded-2xl border border-unproven/35 bg-unproven/10 px-4 py-3">
          <p className="text-sm font-medium text-unproven">Sample board</p>
          <p className="mt-1 text-xs text-fg-muted text-pretty">
            Explore freely, then set up <strong className="text-fg">your</strong>{" "}
            jobsite when ready — Setup → New blank. Opening the app always lands
            on this board, not a blank project.
          </p>
          <Button
            size="sm"
            className="mt-3 w-full"
            onClick={() => {
              setSetupSection("identity");
              setTab("setup");
            }}
          >
            <FolderCog className="size-3.5" />
            Open project setup
          </Button>
        </div>
      ) : null}

      <div className="kpi-grid">
        <Kpi
          label="Open P0"
          value={String(
            project.reports.filter(
              (r) => r.priority === "P0" && r.status !== "resolved",
            ).length,
          )}
          hot
        />
        <Kpi
          label="Open reports"
          value={String(
            project.reports.filter((r) => r.status !== "resolved").length,
          )}
        />
        <button
          type="button"
          className="kpi-card text-left"
          onClick={() => setTab("log")}
        >
          <span className="kpi-value">{project.messages.length}</span>
          <span className="kpi-label">BD lane msgs · open log</span>
        </button>
        <button
          type="button"
          className="kpi-card text-left"
          onClick={() => setPhotoComposer(true)}
        >
          <span className="kpi-value">{photos.length}</span>
          <span className="kpi-label">Photo notes · add</span>
        </button>
      </div>

      {wx ? (
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-fg-muted">
          <CloudSun className="size-4 shrink-0 text-gold" />
          <span>
            Field weather sample: {wx.summary} · {wx.tempF}°F · wind {wx.windMph}{" "}
            mph · rain {wx.precipProb}%
          </span>
        </div>
      ) : null}

      <div className="chip-scroll">
        {(
          [
            ["open", "Open"],
            ["P0", "P0 only"],
            ["all", "All"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "rounded-full border px-3 py-2 text-xs font-semibold",
              filter === id
                ? "border-gold/40 bg-gold/15 text-gold"
                : "border-border bg-surface-1 text-fg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button className="w-full" onClick={() => setComposer((v) => !v)}>
          <Plus className="size-4" />
          {composer ? "Hide report" : "Field report"}
        </Button>
        <Button
          variant="secondary"
          className="w-full"
          onClick={() => setPhotoComposer((v) => !v)}
        >
          <Camera className="size-4" />
          {photoComposer ? "Hide photo" : "Photo note"}
        </Button>
      </div>

      {composer ? <ReportComposer onClose={() => setComposer(false)} /> : null}
      {photoComposer ? (
        <PhotoNoteComposer onClose={() => setPhotoComposer(false)} />
      ) : null}

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
            Priority stack · {shown.length}
          </h2>
          <Filter className="size-3.5 text-fg-subtle" />
        </div>
        {shown.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-4 text-sm text-fg-muted">
            No reports in this filter.
            {!project.isDemo ? " File the first field report above." : null}
          </p>
        ) : null}
        {shown.map((r) => (
          <ReportCard
            key={r.id}
            report={r}
            photos={(project.photos ?? []).filter(
              (ph) =>
                r.photoIds?.includes(ph.id) || ph.relatedReportId === r.id,
            )}
            onSeen={() => {
              markReport(r.id, "seen", ROLE_LABEL[role]);
              toast.message("Marked seen", { description: r.title });
            }}
            onResolve={() => {
              markReport(r.id, "resolved", ROLE_LABEL[role]);
              toast.success("Resolved by a person", { description: r.title });
            }}
            onReopen={() => {
              markReport(r.id, "open");
              toast.message("Reopened", { description: r.title });
            }}
          />
        ))}
      </section>

      <PhotoNotesSection photos={photos} />

      <section className="space-y-2 pb-4">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
          Inspections
        </h2>
        {project.inspections.length === 0 ? (
          <p className="rounded-xl border border-border bg-surface p-4 text-sm text-fg-muted">
            No inspections yet.{" "}
            <button
              type="button"
              className="font-semibold text-gold underline"
              onClick={() => setTab("plan")}
            >
              Add in Plan
            </button>
          </p>
        ) : null}
        {project.inspections.slice(0, 3).map((i) => (
          <div
            key={i.id}
            className="flex items-start justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-3"
          >
            <div className="min-w-0">
              <p className="font-medium text-fg text-pretty">{i.typeLabel}</p>
              <p className="text-xs text-fg-subtle">
                {i.scheduledDate} · {i.timeWindow} · {i.buildingArea}
              </p>
            </div>
            <StatusChip status={i.status} />
          </div>
        ))}
        <Button variant="ghost" className="w-full" onClick={() => setTab("plan")}>
          Full plan & materials
        </Button>
      </section>
    </div>
  );
}

function ReportComposer({ onClose }: { onClose: () => void }) {
  const addReport = useJobsiteStore((s) => s.addReport);
  const role = useJobsiteStore((s) => s.role);
  const setRole = useJobsiteStore((s) => s.setRole);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [area, setArea] = useState("");
  const [priority, setPriority] = useState<Priority>("P1");
  const [category, setCategory] = useState<ReportCategory>("other");
  const [wire, setWire] = useState(false);
  const [pendingPhotos, setPendingPhotos] = useState<
    {
      dataUrl: string;
      source: "camera" | "library";
      width?: number;
      height?: number;
      bytesApprox?: number;
    }[]
  >([]);
  const [busy, setBusy] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);

  async function ingest(file: File, source: "camera" | "library") {
    if (pendingPhotos.length >= MAX_ATTACH_PER_REPORT) {
      toast.error(`Max ${MAX_ATTACH_PER_REPORT} photos per report`);
      return;
    }
    setBusy(true);
    try {
      const c = await fileToCompressedDataUrl(file);
      setPendingPhotos((p) => [
        ...p,
        {
          dataUrl: c.dataUrl,
          source,
          width: c.width,
          height: c.height,
          bytesApprox: c.bytesApprox,
        },
      ]);
    } catch {
      toast.error("Could not read that photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-lpin-glow space-y-3 rounded-2xl p-4">
      <h3 className="font-medium text-fg">Field report</h3>
      <RoleLensStrip role={role} onChange={setRole} compact />
      <p className="text-[11px] text-fg-subtle">
        Metadata: {roleAuthorName(role)} · {ROLE_LABEL[role]}
      </p>
      <input
        className="field-input"
        placeholder="Short title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className="field-input"
        placeholder="Area / bay / floor (optional)"
        value={area}
        onChange={(e) => setArea(e.target.value)}
      />
      <textarea
        className="field-input min-h-28"
        placeholder="What happened, where, and what is blocked"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-xs text-fg-subtle">
          Priority
          <select
            className="field-input"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="P0">P0 — stop / life-safety</option>
            <option value="P1">P1 — today</option>
            <option value="P2">P2 — this week</option>
            <option value="P3">P3 — FYI</option>
          </select>
        </label>
        <label className="space-y-1 text-xs text-fg-subtle">
          Category
          <select
            className="field-input"
            value={category}
            onChange={(e) => setCategory(e.target.value as ReportCategory)}
          >
            <option value="safety">Safety</option>
            <option value="permit">Permit</option>
            <option value="inspection">Inspection</option>
            <option value="materials">Materials</option>
            <option value="weather">Weather</option>
            <option value="other">Other</option>
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium text-fg-muted">Photos on this report</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            disabled={busy || pendingPhotos.length >= MAX_ATTACH_PER_REPORT}
            onClick={() => camRef.current?.click()}
          >
            <Camera className="size-3.5" />
            Camera
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={busy || pendingPhotos.length >= MAX_ATTACH_PER_REPORT}
            onClick={() => libRef.current?.click()}
          >
            <ImagePlus className="size-3.5" />
            Library
          </Button>
          <input
            ref={camRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f)
                void ingest(
                  f,
                  sourceFromInput(e.target.getAttribute("capture")),
                );
              e.target.value = "";
            }}
          />
          <input
            ref={libRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void ingest(f, "library");
              e.target.value = "";
            }}
          />
        </div>
        {pendingPhotos.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {pendingPhotos.map((ph, i) => (
              <div key={i} className="relative shrink-0">
                <img
                  src={ph.dataUrl}
                  alt=""
                  className="h-20 w-20 rounded-lg object-cover ring-1 ring-border"
                />
                <button
                  type="button"
                  className="absolute -right-1 -top-1 flex size-6 items-center justify-center rounded-full bg-disputed text-fg"
                  onClick={() =>
                    setPendingPhotos((list) => list.filter((_, j) => j !== i))
                  }
                  aria-label="Remove photo"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <label className="flex min-h-11 items-center gap-2 text-sm text-fg-muted">
        <input
          type="checkbox"
          checked={wire}
          onChange={(e) => setWire(e.target.checked)}
          className="size-4 accent-[var(--color-gold)]"
        />
        Wire copy to building-department lane + field log
      </label>
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={!title.trim() || !body.trim() || busy}
          onClick={() => {
            const res = addReport({
              title,
              body,
              priority,
              category,
              sendToAuthority: wire,
              area,
              newPhotos: pendingPhotos.map((ph) => ({
                dataUrl: ph.dataUrl,
                source: ph.source,
                caption: title,
                area,
                width: ph.width,
                height: ph.height,
                bytesApprox: ph.bytesApprox,
              })),
            });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("Report filed on this device");
            onClose();
          }}
        >
          File report
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function PhotoNoteComposer({ onClose }: { onClose: () => void }) {
  const addPhotoNote = useJobsiteStore((s) => s.addPhotoNote);
  const role = useJobsiteStore((s) => s.role);
  const setRole = useJobsiteStore((s) => s.setRole);
  const [caption, setCaption] = useState("");
  const [area, setArea] = useState("");
  const [preview, setPreview] = useState<{
    dataUrl: string;
    source: "camera" | "library";
    width?: number;
    height?: number;
    bytesApprox?: number;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const camRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);

  async function ingest(file: File, source: "camera" | "library") {
    setBusy(true);
    try {
      const c = await fileToCompressedDataUrl(file);
      setPreview({
        dataUrl: c.dataUrl,
        source,
        width: c.width,
        height: c.height,
        bytesApprox: c.bytesApprox,
      });
    } catch {
      toast.error("Could not process photo");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card-lpin-glow space-y-3 rounded-2xl p-4">
      <h3 className="flex items-center gap-2 font-medium text-fg">
        <Camera className="size-4 text-gold" />
        Photo note
      </h3>
      <RoleLensStrip role={role} onChange={setRole} compact />
      <p className="text-[11px] text-fg-subtle text-pretty">
        Stored on this device with role metadata. Export pack includes photos.
      </p>
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="secondary"
          disabled={busy}
          onClick={() => camRef.current?.click()}
        >
          <Camera className="size-4" />
          Take photo
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={busy}
          onClick={() => libRef.current?.click()}
        >
          <ImagePlus className="size-4" />
          From library
        </Button>
      </div>
      <input
        ref={camRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void ingest(f, "camera");
          e.target.value = "";
        }}
      />
      <input
        ref={libRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void ingest(f, "library");
          e.target.value = "";
        }}
      />
      {preview ? (
        <img
          src={preview.dataUrl}
          alt="Preview"
          className="max-h-56 w-full rounded-xl object-cover ring-1 ring-border"
        />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-border bg-surface-1 text-xs text-fg-subtle">
          {busy ? "Compressing…" : "No photo yet — camera or library"}
        </div>
      )}
      <input
        className="field-input"
        placeholder="Caption / what this shows"
        value={caption}
        onChange={(e) => setCaption(e.target.value)}
      />
      <input
        className="field-input"
        placeholder="Area / bay (optional)"
        value={area}
        onChange={(e) => setArea(e.target.value)}
      />
      <div className="flex gap-2">
        <Button
          className="flex-1"
          disabled={!preview || !caption.trim() || busy}
          onClick={() => {
            if (!preview) return;
            const res = addPhotoNote({
              dataUrl: preview.dataUrl,
              caption,
              area,
              source: preview.source,
              width: preview.width,
              height: preview.height,
              bytesApprox: preview.bytesApprox,
            });
            if (!res.ok) {
              toast.error(res.error);
              return;
            }
            toast.success("Photo note saved on this device");
            onClose();
          }}
        >
          Save photo note
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

function PhotoNotesSection({ photos }: { photos: PhotoNote[] }) {
  const removePhotoNote = useJobsiteStore((s) => s.removePhotoNote);
  if (photos.length === 0) {
    return (
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
          Photo notes
        </h2>
        <p className="rounded-xl border border-border bg-surface p-4 text-sm text-fg-muted">
          No photo notes yet. Use <strong className="text-fg">Photo note</strong>{" "}
          or attach images when filing a report.
        </p>
      </section>
    );
  }
  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
        Photo notes · {photos.length}
      </h2>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {photos.map((ph) => (
          <article
            key={ph.id}
            className="card-lpin overflow-hidden rounded-2xl"
          >
            <img
              src={ph.dataUrl}
              alt={ph.caption || "Field photo"}
              className="aspect-[4/3] w-full object-cover"
            />
            <div className="space-y-1 p-3">
              <p className="text-sm font-medium text-fg text-pretty">
                {ph.caption || "(no caption)"}
              </p>
              {ph.area ? (
                <p className="text-xs text-gold/90">{ph.area}</p>
              ) : null}
              <p className="text-[11px] text-fg-subtle">
                {ROLE_LABEL[ph.authorRole]} · {ph.authorName} ·{" "}
                {formatRelative(ph.createdAt)} · {ph.source}
              </p>
              <button
                type="button"
                className="inline-flex min-h-10 items-center gap-1 text-xs font-medium text-disputed"
                onClick={() => {
                  removePhotoNote(ph.id);
                  toast.message("Photo note removed");
                }}
              >
                <Trash2 className="size-3.5" />
                Remove
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ReportCard({
  report,
  photos,
  onSeen,
  onResolve,
  onReopen,
}: {
  report: FieldReport;
  photos: PhotoNote[];
  onSeen: () => void;
  onResolve: () => void;
  onReopen: () => void;
}) {
  return (
    <article
      className={cn(
        "card-lpin rounded-2xl p-4 transition-opacity",
        report.status === "resolved" && "opacity-70",
      )}
    >
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-2 py-0.5 text-[11px] font-bold tracking-wide",
            PRIORITY_STYLE[report.priority],
          )}
        >
          {report.priority}
        </span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] uppercase tracking-wide text-fg-subtle">
          {report.category}
        </span>
        <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 text-[11px] font-semibold text-gold">
          {ROLE_LABEL[report.authorRole]}
        </span>
        <span className="text-[11px] text-fg-subtle">
          {formatRelative(report.createdAt)}
        </span>
        {report.status === "resolved" ? (
          <span className="inline-flex items-center gap-1 text-[11px] text-supported">
            <CheckCircle2 className="size-3" /> resolved
          </span>
        ) : report.status === "seen" ? (
          <span className="text-[11px] text-gold">seen</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[11px] text-disputed">
            <AlertTriangle className="size-3" /> open
          </span>
        )}
      </div>
      <h3 className="font-medium text-fg text-pretty">{report.title}</h3>
      {report.area ? (
        <p className="mt-0.5 text-xs text-gold/90">{report.area}</p>
      ) : null}
      <p className="mt-1 text-sm leading-relaxed text-fg-muted text-pretty">
        {report.body}
      </p>
      {photos.length > 0 ? (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {photos.map((ph) => (
            <img
              key={ph.id}
              src={ph.dataUrl}
              alt={ph.caption}
              className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-border"
            />
          ))}
        </div>
      ) : null}
      <p className="mt-2 text-xs text-fg-subtle">
        {report.authorName}
        {report.sendToAuthority ? " · wired to authority lane" : ""}
        {report.seenBy ? ` · seen by ${report.seenBy}` : ""}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {report.status === "open" ? (
          <Button size="sm" variant="secondary" onClick={onSeen}>
            Mark seen
          </Button>
        ) : null}
        {report.status !== "resolved" ? (
          <Button size="sm" variant="success" onClick={onResolve}>
            Resolve
          </Button>
        ) : (
          <Button size="sm" variant="outline" onClick={onReopen}>
            Reopen
          </Button>
        )}
      </div>
    </article>
  );
}

function LogTab() {
  const project = useJobsiteStore((s) => s.project);
  const logLane = useJobsiteStore((s) => s.logLane);
  const setLogLane = useJobsiteStore((s) => s.setLogLane);
  const logDivision = useJobsiteStore((s) => s.logDivision);
  const setLogDivision = useJobsiteStore((s) => s.setLogDivision);
  const ackFieldComm = useJobsiteStore((s) => s.ackFieldComm);
  const addAuthorityMessage = useJobsiteStore((s) => s.addAuthorityMessage);
  const role = useJobsiteStore((s) => s.role);
  const setRole = useJobsiteStore((s) => s.setRole);
  const [compose, setCompose] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  const divisions = useMemo(() => {
    const set = new Set(
      project.fieldComms.messages.map((m) => m.division.toUpperCase()),
    );
    return ["ALL", ...Array.from(set).sort()];
  }, [project.fieldComms.messages]);

  const fieldMsgs = useMemo(() => {
    let list = [...project.fieldComms.messages];
    if (logDivision !== "ALL") {
      list = list.filter(
        (m) =>
          m.division.toUpperCase() === logDivision ||
          m.scopes?.some((s) => s.toUpperCase() === logDivision),
      );
    }
    if (logLane === "acks") {
      list = list.filter((m) => m.ackRequired && !m.acked);
    }
    return list.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );
  }, [project.fieldComms.messages, logDivision, logLane]);

  const authMsgs = useMemo(
    () =>
      [...project.messages].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
    [project.messages],
  );

  const showAuth = logLane === "all" || logLane === "authority";
  const showField = logLane === "all" || logLane === "field" || logLane === "acks";

  return (
    <div className="space-y-4 animate-enter">
      <p className="text-sm text-fg-muted text-pretty">
        Building-department lane plus division field log. Not a city portal —
        export packets for real offices. Role lens stamps author metadata.
      </p>

      <div className="chip-scroll">
        {(
          [
            ["all", "All traffic"],
            ["authority", "BD lane"],
            ["field", "Field log"],
            ["acks", "Acks due"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setLogLane(id as LogLane)}
            className={cn(
              "rounded-full border px-3 py-2 text-xs font-semibold",
              logLane === id
                ? "border-gold/40 bg-gold/15 text-gold"
                : "border-border bg-surface-1 text-fg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {showField && divisions.length > 1 ? (
        <div className="chip-scroll">
          {divisions.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setLogDivision(d)}
              className={cn(
                "rounded-full border px-2.5 py-1.5 text-[11px] font-semibold",
                logDivision === d
                  ? "border-wave/40 bg-wave/15 text-wave"
                  : "border-border bg-surface-1 text-fg-muted",
              )}
            >
              {d === "ALL" ? "All div" : `Div ${d}`}
            </button>
          ))}
        </div>
      ) : null}

      <Button
        variant="secondary"
        className="w-full"
        onClick={() => setCompose((v) => !v)}
      >
        <Send className="size-4" />
        {compose ? "Hide composer" : "Compose BD / internal message"}
      </Button>

      {compose ? (
        <div className="card-lpin space-y-2 rounded-2xl p-4">
          <RoleLensStrip role={role} onChange={setRole} compact />
          <p className="text-[11px] text-fg-subtle">
            From: {roleAuthorName(role)}
          </p>
          <input
            className="field-input"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <textarea
            className="field-input min-h-24"
            placeholder="Message body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex gap-2">
            <Button
              className="flex-1"
              disabled={!subject.trim() || !body.trim()}
              onClick={() => {
                addAuthorityMessage({
                  subject,
                  body,
                  direction: "field_to_authority",
                });
                setSubject("");
                setBody("");
                setCompose(false);
                toast.success("Message filed on this device");
              }}
            >
              Send to BD lane
            </Button>
            <Button
              variant="outline"
              disabled={!subject.trim() || !body.trim()}
              onClick={() => {
                addAuthorityMessage({
                  subject,
                  body,
                  direction: "internal",
                });
                setSubject("");
                setBody("");
                setCompose(false);
                toast.message("Internal note saved");
              }}
            >
              Internal
            </Button>
          </div>
        </div>
      ) : null}

      {showAuth ? (
        <section className="space-y-2">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
            <MessageSquare className="size-3.5" />
            Building-department lane · {authMsgs.length}
          </h2>
          {authMsgs.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm text-fg-muted">
              No BD lane messages yet. Compose one above or wire a field report.
            </p>
          ) : null}
          {authMsgs.map((m) => (
            <article key={m.id} className="card-lpin rounded-2xl p-4">
              <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] text-fg-subtle">
                <span className="uppercase tracking-wide">
                  {m.direction.replaceAll("_", " ")}
                </span>
                <span className="rounded-full border border-gold/30 bg-gold/10 px-2 py-0.5 font-semibold text-gold">
                  {ROLE_LABEL[m.authorRole]}
                </span>
                <span>· {formatRelative(m.createdAt)}</span>
                <span className="rounded-full bg-surface-2 px-2 py-0.5">
                  {m.status}
                </span>
              </div>
              <h3 className="font-medium text-fg text-pretty">{m.subject}</h3>
              <p className="mt-1 whitespace-pre-wrap text-sm text-fg-muted text-pretty">
                {m.body}
              </p>
              <p className="mt-2 text-xs text-fg-subtle">{m.authorName}</p>
            </article>
          ))}
        </section>
      ) : null}

      {showField ? (
        <section className="space-y-2 pb-6">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
            <ClipboardList className="size-3.5" />
            Field comms · {fieldMsgs.length}
          </h2>
          {fieldMsgs.length === 0 ? (
            <p className="rounded-xl border border-border bg-surface p-4 text-sm text-fg-muted">
              Field log empty — filing a report or photo note adds an entry.
            </p>
          ) : null}
          {fieldMsgs.map((m) => (
            <FieldCommCard
              key={m.id}
              msg={m}
              onAck={() => {
                ackFieldComm(m.id);
                toast.message("Ack recorded");
              }}
            />
          ))}
        </section>
      ) : null}
    </div>
  );
}

function FieldCommCard({
  msg,
  onAck,
}: {
  msg: FieldComm;
  onAck: () => void;
}) {
  return (
    <article className="card-lpin rounded-2xl p-4">
      <div className="mb-1 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-full border border-border-strong bg-surface-2 px-2 py-0.5 font-semibold text-gold">
          Div {msg.division}
        </span>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-fg-subtle">
          {msg.kind.replaceAll("_", " ")}
        </span>
        <span className="rounded-full border border-border px-2 py-0.5 text-fg-muted">
          {msg.fromRole}
        </span>
        <span className="text-fg-subtle">{formatRelative(msg.createdAt)}</span>
        {msg.ackRequired ? (
          msg.acked ? (
            <span className="text-supported">acked</span>
          ) : (
            <span className="font-semibold text-disputed">ack due</span>
          )
        ) : null}
      </div>
      <p className="text-sm leading-relaxed text-fg text-pretty">{msg.text}</p>
      <p className="mt-2 text-xs text-fg-subtle">
        {msg.fromName} → {msg.toNames.join(", ")}
      </p>
      {msg.ackRequired && !msg.acked ? (
        <Button size="sm" variant="success" className="mt-3" onClick={onAck}>
          Record ack
        </Button>
      ) : null}
    </article>
  );
}

function PlanTab() {
  const project = useJobsiteStore((s) => s.project);
  const [section, setSection] = useState<"insp" | "sched" | "mats" | "people">(
    "insp",
  );
  const [adding, setAdding] = useState(false);

  return (
    <div className="space-y-4 animate-enter">
      <p className="text-sm text-fg-muted text-pretty">
        Build the full plan on this phone — inspections, schedule, materials, and
        contacts. Same capability as desktop setup, field-sized.
      </p>
      <div className="chip-scroll">
        {(
          [
            ["insp", "Inspections"],
            ["sched", "Schedule"],
            ["mats", "Materials"],
            ["people", "Contacts"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setSection(id);
              setAdding(false);
            }}
            className={cn(
              "rounded-full border px-3 py-2 text-xs font-semibold",
              section === id
                ? "border-gold/40 bg-gold/15 text-gold"
                : "border-border bg-surface-1 text-fg-muted",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <Button
        variant="secondary"
        className="w-full"
        onClick={() => setAdding((v) => !v)}
      >
        <Plus className="size-4" />
        {adding
          ? "Hide form"
          : section === "insp"
            ? "Add inspection"
            : section === "sched"
              ? "Add schedule item"
              : section === "mats"
                ? "Add material line"
                : "Add contact"}
      </Button>

      {adding && section === "insp" ? (
        <InspectionForm onDone={() => setAdding(false)} />
      ) : null}
      {adding && section === "sched" ? (
        <ScheduleForm onDone={() => setAdding(false)} />
      ) : null}
      {adding && section === "mats" ? (
        <MaterialForm onDone={() => setAdding(false)} />
      ) : null}
      {adding && section === "people" ? (
        <ContactForm onDone={() => setAdding(false)} />
      ) : null}

      {section === "insp" ? (
        <section className="space-y-2 pb-6">
          {project.inspections.length === 0 ? (
            <EmptyHint text="No inspections — add the next city walk." />
          ) : null}
          {project.inspections.map((i) => (
            <article key={i.id} className="card-lpin rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-medium text-fg text-pretty">{i.typeLabel}</h3>
                <StatusChip status={i.status} />
              </div>
              <p className="mt-1 text-sm text-fg-muted">
                {i.scheduledDate} · {i.timeWindow}
              </p>
              <p className="text-sm text-fg-subtle">{i.buildingArea}</p>
              <p className="mt-1 text-xs text-fg-subtle">
                {i.requestedBy} · {i.authorityOffice}
              </p>
              {i.notes ? (
                <p className="mt-2 text-xs text-unproven text-pretty">{i.notes}</p>
              ) : null}
              <DeleteRow
                onDelete={() => {
                  useJobsiteStore.getState().removeInspection(i.id);
                  toast.message("Inspection removed");
                }}
              />
            </article>
          ))}
        </section>
      ) : null}

      {section === "sched" ? (
        <section className="space-y-2 pb-6">
          {project.schedule.length === 0 ? (
            <EmptyHint text="No schedule lines — add critical path items." />
          ) : null}
          {project.schedule.map((s) => (
            <div
              key={s.id}
              className="rounded-xl border border-border bg-surface px-3 py-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-fg">{s.name}</p>
                  <p className="text-xs text-fg-subtle">
                    {s.start} → {s.end} · {s.owner}
                  </p>
                </div>
                <StatusChip status={s.status} />
              </div>
              {typeof s.pct === "number" ? (
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-gold/80"
                    style={{ width: `${Math.min(100, Math.max(0, s.pct))}%` }}
                  />
                </div>
              ) : null}
              <DeleteRow
                onDelete={() => {
                  useJobsiteStore.getState().removeSchedule(s.id);
                  toast.message("Schedule item removed");
                }}
              />
            </div>
          ))}
        </section>
      ) : null}

      {section === "mats" ? (
        <section className="space-y-2 pb-6">
          {project.materials.length === 0 ? (
            <EmptyHint text="No materials — track shorts and on-site stock." />
          ) : null}
          {project.materials.map((m) => (
            <div
              key={m.id}
              className="rounded-xl border border-border bg-surface px-3 py-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-fg">{m.name}</p>
                  <p className="text-xs text-fg-subtle">
                    {m.qty} {m.unit}
                    {m.division ? ` · Div ${m.division}` : ""}
                    {m.note ? ` · ${m.note}` : ""}
                  </p>
                </div>
                <StatusChip status={m.status} />
              </div>
              <DeleteRow
                onDelete={() => {
                  useJobsiteStore.getState().removeMaterial(m.id);
                  toast.message("Material line removed");
                }}
              />
            </div>
          ))}
        </section>
      ) : null}

      {section === "people" ? (
        <section className="space-y-2 pb-6">
          {project.contacts.length === 0 ? (
            <EmptyHint text="No contacts — add super, AHJ, trades." />
          ) : null}
          {project.contacts.map((c) => (
            <div
              key={c.id}
              className="card-lpin flex items-start gap-3 rounded-2xl p-4"
            >
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-gold">
                {c.lane === "field" ? (
                  <HardHat className="size-4" />
                ) : c.lane === "authority" ? (
                  <ShieldAlert className="size-4" />
                ) : (
                  <Users className="size-4" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-fg">{c.name}</p>
                <p className="text-sm text-fg-muted">
                  {c.role} · {c.org}
                </p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {c.phone ? (
                    <span className="inline-flex items-center gap-1">
                      <Phone className="size-3" />
                      {c.phone}
                    </span>
                  ) : null}
                  {c.email ? ` · ${c.email}` : ""}
                </p>
                <DeleteRow
                  onDelete={() => {
                    useJobsiteStore.getState().removeContact(c.id);
                    toast.message("Contact removed");
                  }}
                />
              </div>
            </div>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <p className="rounded-xl border border-border bg-surface p-4 text-sm text-fg-muted">
      {text}
    </p>
  );
}

function DeleteRow({ onDelete }: { onDelete: () => void }) {
  return (
    <button
      type="button"
      onClick={onDelete}
      className="mt-2 inline-flex min-h-10 items-center gap-1 text-xs font-medium text-disputed"
    >
      <Trash2 className="size-3.5" />
      Remove
    </button>
  );
}

function InspectionForm({ onDone }: { onDone: () => void }) {
  const upsert = useJobsiteStore((s) => s.upsertInspection);
  const office = useJobsiteStore((s) => s.project.permittingOffice);
  const [typeLabel, setTypeLabel] = useState("");
  const [scheduledDate, setScheduledDate] = useState(todayYmd());
  const [timeWindow, setTimeWindow] = useState("Morning");
  const [buildingArea, setBuildingArea] = useState("");
  const [status, setStatus] = useState<InspectionStatus>("requested");
  const [requestedBy, setRequestedBy] = useState("");
  const [notes, setNotes] = useState("");

  return (
    <div className="card-lpin-glow space-y-2 rounded-2xl p-4">
      <input
        className="field-input"
        placeholder="Inspection type"
        value={typeLabel}
        onChange={(e) => setTypeLabel(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          className="field-input"
          value={scheduledDate}
          onChange={(e) => setScheduledDate(e.target.value)}
        />
        <input
          className="field-input"
          placeholder="Time window"
          value={timeWindow}
          onChange={(e) => setTimeWindow(e.target.value)}
        />
      </div>
      <input
        className="field-input"
        placeholder="Building area"
        value={buildingArea}
        onChange={(e) => setBuildingArea(e.target.value)}
      />
      <input
        className="field-input"
        placeholder="Requested by"
        value={requestedBy}
        onChange={(e) => setRequestedBy(e.target.value)}
      />
      <select
        className="field-input"
        value={status}
        onChange={(e) => setStatus(e.target.value as InspectionStatus)}
      >
        <option value="requested">Requested</option>
        <option value="scheduled">Scheduled</option>
        <option value="ready_for_inspector">Ready for inspector</option>
        <option value="passed">Passed</option>
        <option value="failed">Failed</option>
        <option value="cancelled">Cancelled</option>
      </select>
      <textarea
        className="field-input min-h-20"
        placeholder="Notes"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
      />
      <Button
        className="w-full"
        disabled={!typeLabel.trim()}
        onClick={() => {
          upsert({
            typeLabel,
            scheduledDate,
            timeWindow,
            buildingArea,
            status,
            requestedBy: requestedBy || "Field (this device)",
            notes,
            authorityOffice: office,
          });
          toast.success("Inspection added");
          onDone();
        }}
      >
        Save inspection
      </Button>
    </div>
  );
}

function ScheduleForm({ onDone }: { onDone: () => void }) {
  const upsert = useJobsiteStore((s) => s.upsertSchedule);
  const [name, setName] = useState("");
  const [start, setStart] = useState(todayYmd());
  const [end, setEnd] = useState(todayYmd());
  const [owner, setOwner] = useState("");
  const [status, setStatus] = useState<ScheduleItemStatus>("on_track");
  const [pct, setPct] = useState("0");

  return (
    <div className="card-lpin-glow space-y-2 rounded-2xl p-4">
      <input
        className="field-input"
        placeholder="Activity name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="date"
          className="field-input"
          value={start}
          onChange={(e) => setStart(e.target.value)}
        />
        <input
          type="date"
          className="field-input"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
        />
      </div>
      <input
        className="field-input"
        placeholder="Owner / trade"
        value={owner}
        onChange={(e) => setOwner(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          className="field-input"
          value={status}
          onChange={(e) => setStatus(e.target.value as ScheduleItemStatus)}
        >
          <option value="on_track">On track</option>
          <option value="at_risk">At risk</option>
          <option value="blocked">Blocked</option>
          <option value="done">Done</option>
        </select>
        <input
          className="field-input"
          inputMode="numeric"
          placeholder="% complete"
          value={pct}
          onChange={(e) => setPct(e.target.value)}
        />
      </div>
      <Button
        className="w-full"
        disabled={!name.trim()}
        onClick={() => {
          upsert({
            name,
            start,
            end,
            owner: owner || "GC",
            status,
            pct: Number(pct) || 0,
          });
          toast.success("Schedule item added");
          onDone();
        }}
      >
        Save schedule item
      </Button>
    </div>
  );
}

type ScheduleItemStatus = "on_track" | "at_risk" | "blocked" | "done";
type MatStatus = "on_site" | "ordered" | "short" | "blocked";

function MaterialForm({ onDone }: { onDone: () => void }) {
  const upsert = useJobsiteStore((s) => s.upsertMaterial);
  const [name, setName] = useState("");
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("ea");
  const [status, setStatus] = useState<MatStatus>("ordered");
  const [note, setNote] = useState("");
  const [division, setDivision] = useState("");

  return (
    <div className="card-lpin-glow space-y-2 rounded-2xl p-4">
      <input
        className="field-input"
        placeholder="Material name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          className="field-input"
          inputMode="decimal"
          placeholder="Qty"
          value={qty}
          onChange={(e) => setQty(e.target.value)}
        />
        <input
          className="field-input"
          placeholder="Unit"
          value={unit}
          onChange={(e) => setUnit(e.target.value)}
        />
      </div>
      <select
        className="field-input"
        value={status}
        onChange={(e) => setStatus(e.target.value as MatStatus)}
      >
        <option value="on_site">On site</option>
        <option value="ordered">Ordered</option>
        <option value="short">Short</option>
        <option value="blocked">Blocked</option>
      </select>
      <input
        className="field-input"
        placeholder="Division (optional)"
        value={division}
        onChange={(e) => setDivision(e.target.value)}
      />
      <input
        className="field-input"
        placeholder="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <Button
        className="w-full"
        disabled={!name.trim()}
        onClick={() => {
          upsert({
            name,
            qty: Number(qty) || 0,
            unit,
            status,
            note,
            division,
          });
          toast.success("Material line added");
          onDone();
        }}
      >
        Save material
      </Button>
    </div>
  );
}

function ContactForm({ onDone }: { onDone: () => void }) {
  const upsert = useJobsiteStore((s) => s.upsertContact);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [org, setOrg] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [lane, setLane] = useState<ProjectContact["lane"]>("field");

  return (
    <div className="card-lpin-glow space-y-2 rounded-2xl p-4">
      <input
        className="field-input"
        placeholder="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className="field-input"
        placeholder="Role / title"
        value={role}
        onChange={(e) => setRole(e.target.value)}
      />
      <input
        className="field-input"
        placeholder="Organization"
        value={org}
        onChange={(e) => setOrg(e.target.value)}
      />
      <input
        className="field-input"
        placeholder="Phone"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
      />
      <input
        className="field-input"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />
      <select
        className="field-input"
        value={lane}
        onChange={(e) => setLane(e.target.value as ProjectContact["lane"])}
      >
        <option value="field">Field</option>
        <option value="office">Office</option>
        <option value="owner">Owner</option>
        <option value="authority">Authority</option>
        <option value="trade">Trade</option>
      </select>
      <Button
        className="w-full"
        disabled={!name.trim()}
        onClick={() => {
          upsert({ name, role, org, phone, email, lane });
          toast.success("Contact added");
          onDone();
        }}
      >
        Save contact
      </Button>
    </div>
  );
}

function MapTab() {
  return (
    <div className="animate-enter pb-8">
      <SiteMapPanel />
    </div>
  );
}

function Kpi({
  label,
  value,
  hot,
}: {
  label: string;
  value: string;
  hot?: boolean;
}) {
  return (
    <div className={cn("kpi-card", hot && "border-disputed/40")}>
      <span className={cn("kpi-value", hot && "text-disputed")}>{value}</span>
      <span className="kpi-label">{label}</span>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const tone =
    status === "blocked" || status === "failed" || status === "short"
      ? "text-disputed bg-disputed/10 border-disputed/30"
      : status === "at_risk" || status === "requested" || status === "ordered"
        ? "text-unproven bg-unproven/10 border-unproven/30"
        : status === "passed" ||
            status === "done" ||
            status === "on_site" ||
            status === "on_track"
          ? "text-supported bg-supported/10 border-supported/30"
          : "text-fg-muted bg-surface-2 border-border";
  return (
    <span
      className={cn(
        "shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone,
      )}
    >
      {status.replaceAll("_", " ")}
    </span>
  );
}
