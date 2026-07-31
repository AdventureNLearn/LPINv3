import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Download,
  FolderOpen,
  MapPin,
  Sparkles,
  Trash2,
  Upload,
  ClipboardCopy,
} from "lucide-react";
import { toast } from "sonner";
import { HarborRulesCard } from "@/components/integrity/HarborRules";
import { Button } from "@/components/ui/button";
import { buildDeskSummary, downloadPack } from "@/lib/jobsite/pack";
import { useJobsiteStore } from "@/lib/jobsite/store";
import type { ProjectIdentity } from "@/lib/jobsite/types";
import { ROLE_OPTIONS } from "@/lib/jobsite/types";
import {
  INDUSTRIES,
  US_STATES,
  defaultOfficeForState,
  todayYmd,
} from "@/lib/jobsite/us-states";
import { cn, formatRelative } from "@/lib/utils";

function syncForm(project: {
  name: string;
  location: string;
  cityState?: string;
  permitNumber: string;
  permittingOffice: string;
  stateCode?: string;
  captainName: string;
  notes: string;
  industry: string;
  projectStartDate?: string;
  materialsBudget?: number;
}) {
  return {
    name: project.name,
    location: project.location,
    cityState: project.cityState ?? "",
    permitNumber: project.permitNumber,
    permittingOffice: project.permittingOffice,
    stateCode: project.stateCode ?? "",
    captainName: project.captainName ?? "",
    notes: project.notes ?? "",
    industry: project.industry ?? "commercial",
    projectStartDate: project.projectStartDate ?? todayYmd(),
    materialsBudget:
      project.materialsBudget != null ? String(project.materialsBudget) : "",
  };
}

export function ProjectSetupPanel() {
  const project = useJobsiteStore((s) => s.project);
  const projects = useJobsiteStore((s) => s.projects);
  const section = useJobsiteStore((s) => s.setupSection);
  const setSetupSection = useJobsiteStore((s) => s.setSetupSection);
  const updateProject = useJobsiteStore((s) => s.updateProject);
  const startNewProject = useJobsiteStore((s) => s.startNewProject);
  const loadDemo = useJobsiteStore((s) => s.loadDemo);
  const switchProject = useJobsiteStore((s) => s.switchProject);
  const deleteProject = useJobsiteStore((s) => s.deleteProject);
  const importProject = useJobsiteStore((s) => s.importProject);
  const role = useJobsiteStore((s) => s.role);
  const setRole = useJobsiteStore((s) => s.setRole);
  const setTab = useJobsiteStore((s) => s.setTab);

  const [form, setForm] = useState(() => syncForm(project));
  const [pending, setPending] = useState<null | "blank" | "demo">(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm(syncForm(project));
  }, [project.id, project.updatedAt, project.isDemo]);

  function setField<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function identity(): ProjectIdentity {
    const budget = form.materialsBudget.trim()
      ? Number(form.materialsBudget)
      : undefined;
    return {
      name: form.name,
      location: form.location,
      cityState: form.cityState || undefined,
      permitNumber: form.permitNumber,
      permittingOffice: form.permittingOffice,
      stateCode: form.stateCode || undefined,
      captainName: form.captainName || undefined,
      notes: form.notes || undefined,
      industry: form.industry || undefined,
      projectStartDate: form.projectStartDate || undefined,
      materialsBudget:
        budget != null && !Number.isNaN(budget) ? budget : undefined,
    };
  }

  function onStateChange(code: string) {
    setForm((f) => ({
      ...f,
      stateCode: code,
      cityState: "",
      permittingOffice: defaultOfficeForState(code),
    }));
  }

  function saveIdentity() {
    if (!form.name.trim()) {
      toast.error("Jobsite name is required.");
      return;
    }
    updateProject(identity());
    toast.success("Jobsite saved on this device.");
  }

  function executeBlank() {
    startNewProject({
      name: "My jobsite",
      location: "United States",
      permitNumber: "TBD",
      permittingOffice: "City / County Building Department",
    });
    setPending(null);
    toast.success("Blank jobsite ready — enter site identity.");
  }

  function executeDemo() {
    loadDemo();
    setPending(null);
    toast.message("Sample multi-family board loaded.");
  }

  async function onImportFile(file: File) {
    try {
      const text = await file.text();
      const result = importProject(text);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Project pack imported — board updated.");
    } catch {
      toast.error("Could not read that file.");
    }
  }

  return (
    <div className="space-y-4 animate-enter pb-8">
      <div className="chip-scroll">
        {(
          [
            ["identity", "Identity"],
            ["portfolio", "Projects"],
            ["handoff", "Handoff"],
            ["role", "Role"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setSetupSection(id)}
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

      {project.isDemo ? (
        <div className="rounded-2xl border border-unproven/35 bg-unproven/10 px-4 py-3 text-sm text-fg">
          <p className="font-medium text-unproven">Sample board is loaded</p>
          <p className="mt-1 text-xs text-fg-muted text-pretty">
            Walk the wired lanes, then start a blank jobsite for real work.
            Sample permits are labeled demo so they are never mistaken for a live
            file. Reopening the app always returns to the Board — not a blank
            project.
          </p>
          <Button
            type="button"
            className="mt-3 w-full"
            onClick={() => setPending("blank")}
          >
            <Sparkles className="size-4" />
            Start blank jobsite
          </Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-supported/30 bg-supported/10 px-4 py-3 text-xs text-supported text-pretty">
          Live jobsite · {project.reports.length} reports ·{" "}
          {project.photos?.length ?? 0} photos · {project.inspections.length}{" "}
          inspections · {project.contacts.length} contacts
          {project.stateCode ? ` · ${project.stateCode}` : ""}
        </div>
      )}

      {pending ? (
        <div
          className="rounded-2xl border border-disputed/40 bg-disputed/10 p-4"
          role="alertdialog"
        >
          <p className="text-sm font-medium text-fg">
            {pending === "blank"
              ? "Start a blank jobsite on this device?"
              : "Reload the sample multi-family board?"}
          </p>
          <p className="mt-1 text-xs text-fg-muted text-pretty">
            {pending === "blank"
              ? "Creates a new live board only when you confirm. Other projects stay in Projects. Export a pack first if you need a backup of the active board."
              : "Sample replaces the demo slot. Live projects are kept."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              type="button"
              onClick={() =>
                pending === "blank" ? executeBlank() : executeDemo()
              }
            >
              {pending === "blank"
                ? "Yes — start blank jobsite"
                : "Yes — load sample"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => setPending(null)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      {section === "identity" ? (
        <section className="card-lpin space-y-4 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-gold" />
            <h2 className="text-sm font-medium text-fg">Site identity</h2>
          </div>
          <p className="text-xs text-fg-subtle text-pretty">
            Put <strong className="text-fg-muted">your</strong> project on this
            board — name, permit, and building department. Full setup works on
            phone without desktop.
          </p>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">State</span>
            <select
              className="field-input"
              value={form.stateCode}
              onChange={(e) => onStateChange(e.target.value)}
            >
              <option value="">— select state —</option>
              {US_STATES.map((s) => (
                <option key={s.code} value={s.code}>
                  {s.name} ({s.code})
                </option>
              ))}
            </select>
            <span className="block text-[11px] text-fg-subtle">
              {US_STATES.find((s) => s.code === form.stateCode)?.note ??
                "State selection sets AHJ office defaults. Type city/county freeform."}
            </span>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">Jobsite name</span>
            <input
              className="field-input"
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="Building name or contract"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">
              Site address / location
            </span>
            <input
              className="field-input"
              value={form.location}
              onChange={(e) => setField("location", e.target.value)}
              placeholder="Street or site description"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">
              City / county (type in)
            </span>
            <input
              className="field-input"
              value={form.cityState}
              onChange={(e) => setField("cityState", e.target.value)}
              placeholder="County or city as your AHJ lists it"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">
              Building permit number
            </span>
            <input
              className="field-input"
              value={form.permitNumber}
              onChange={(e) => setField("permitNumber", e.target.value)}
              placeholder="Permit # or TBD"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">
              Building department / AHJ desk
            </span>
            <input
              className="field-input"
              value={form.permittingOffice}
              onChange={(e) => setField("permittingOffice", e.target.value)}
              placeholder="Local building department"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">
              Superintendent / site lead
            </span>
            <input
              className="field-input"
              value={form.captainName}
              onChange={(e) => setField("captainName", e.target.value)}
              placeholder="Name and title"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">Industry</span>
            <select
              className="field-input"
              value={form.industry}
              onChange={(e) => setField("industry", e.target.value)}
            >
              {INDUSTRIES.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.label}
                </option>
              ))}
            </select>
          </label>

          <div className="grid grid-cols-2 gap-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-fg-muted">
                Project start
              </span>
              <input
                type="date"
                className="field-input"
                value={form.projectStartDate}
                onChange={(e) => setField("projectStartDate", e.target.value)}
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-fg-muted">
                Materials budget
              </span>
              <input
                className="field-input"
                inputMode="decimal"
                value={form.materialsBudget}
                onChange={(e) => setField("materialsBudget", e.target.value)}
                placeholder="Optional $"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">Notes</span>
            <textarea
              className="field-input min-h-24"
              value={form.notes}
              onChange={(e) => setField("notes", e.target.value)}
              placeholder="Scope notes, gates, handoff context"
            />
          </label>

          <Button className="w-full" onClick={saveIdentity}>
            <Building2 className="size-4" />
            Save jobsite on this device
          </Button>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setTab("map")}
            >
              Set map pin
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setTab("plan")}
            >
              Add plan items
            </Button>
          </div>
        </section>
      ) : null}

      {section === "portfolio" ? (
        <section className="space-y-3">
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => setPending("blank")}>
              <Sparkles className="size-4" />
              New blank
            </Button>
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setPending("demo")}
            >
              Load sample
            </Button>
          </div>
          <p className="text-xs text-fg-subtle text-pretty">
            Multiple projects live on this device. Switch anytime — each board
            keeps its own reports, log, map, photos, and plan. Opening the app
            always lands on Board for the active project.
          </p>
          {projects.map((p) => {
            const active = p.id === project.id;
            return (
              <article
                key={p.id}
                className={cn(
                  "card-lpin rounded-2xl p-4",
                  active &&
                    "ring-1 ring-[color-mix(in_oklab,var(--color-gold)_40%,transparent)]",
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-fg text-pretty">{p.name}</p>
                    <p className="text-xs text-fg-subtle">
                      {p.isDemo ? "Sample · " : "Live · "}
                      {p.stateCode ?? "no state"} ·{" "}
                      {p.industry.replaceAll("_", " ")}
                      <br />
                      Updated {formatRelative(p.updatedAt)} · {p.reports.length}{" "}
                      reports · {p.photos?.length ?? 0} photos
                    </p>
                  </div>
                  {active ? (
                    <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-[10px] font-bold uppercase text-gold">
                      Active
                    </span>
                  ) : null}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {!active ? (
                    <Button
                      size="sm"
                      onClick={() => {
                        switchProject(p.id);
                        toast.message(`Active: ${p.name}`);
                      }}
                    >
                      Switch to this
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setTab("board")}
                    >
                      Open board
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-disputed"
                    onClick={() => {
                      if (
                        confirm(
                          `Delete “${p.name}” from this device? Export a pack first if you need it.`,
                        )
                      ) {
                        deleteProject(p.id);
                        toast.message("Project removed from this device");
                      }
                    }}
                  >
                    <Trash2 className="size-3.5" />
                    Delete
                  </Button>
                </div>
              </article>
            );
          })}
        </section>
      ) : null}

      {section === "handoff" ? (
        <section className="card-lpin space-y-3 rounded-2xl p-4">
          <div className="flex items-center gap-2">
            <FolderOpen className="size-4 text-gold" />
            <h2 className="text-sm font-medium text-fg">Pack handoff</h2>
          </div>
          <p className="text-xs text-fg-subtle text-pretty">
            Export open JSON to another phone or laptop (includes photo notes).
            Import a pack to restore or receive a board. Not a city portal.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              try {
                downloadPack(useJobsiteStore.getState().project);
                toast.success("Project pack downloaded");
              } catch {
                toast.error("Could not download pack");
              }
            }}
          >
            <Download className="size-4" />
            Export .lpin-jobsite.json
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json,.lpin-jobsite.json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onImportFile(f);
              e.target.value = "";
            }}
          />
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            Import project pack
          </Button>
          <Button
            variant="outline"
            className="w-full"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  buildDeskSummary(useJobsiteStore.getState().project),
                );
                toast.success("Desk summary copied");
              } catch {
                toast.error("Could not copy");
              }
            }}
          >
            <ClipboardCopy className="size-4" />
            Copy desk summary
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              const j = useJobsiteStore.getState().project;
              const body = encodeURIComponent(buildDeskSummary(j));
              const sub = encodeURIComponent(`LPINv3 Jobsite — ${j.name}`);
              window.location.href = `mailto:?subject=${sub}&body=${body}`;
            }}
          >
            Email desk summary
          </Button>
        </section>
      ) : null}

      {section === "role" ? (
        <section className="card-lpin space-y-3 rounded-2xl p-4">
          <h2 className="text-sm font-medium text-fg">Who you are right now</h2>
          <p className="text-xs text-fg-subtle text-pretty">
            Role lens embeds author metadata on every report, photo note, and BD
            message. Same control lives on the Board header so you can switch
            without opening Setup. Does not log into any city system.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setRole(opt.id)}
                className={cn(
                  "min-h-11 rounded-xl border px-3 py-2 text-sm font-medium",
                  role === opt.id
                    ? "border-[color-mix(in_oklab,var(--color-gold)_45%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-gold)_14%,var(--color-surface-2))] text-gold"
                    : "border-border bg-surface-1 text-fg-muted",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      <HarborRulesCard compact />
    </div>
  );
}
