import { useMemo, useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  materialLineCost,
  materialsTotals,
} from "@/lib/jobsite/apply-template";
import { divisionLabel, TRADE_DIVISIONS } from "@/lib/jobsite/divisions";
import { useJobsiteStore } from "@/lib/jobsite/store";
import type {
  MaterialStatus,
  TradeDivision,
} from "@/lib/jobsite/types";
import { cn } from "@/lib/utils";

function money(n: number): string {
  return n.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function statusLabel(s: MaterialStatus): string {
  switch (s) {
    case "needed":
      return "Needed";
    case "quoted":
      return "Quoted";
    case "ordered":
      return "Ordered";
    case "partial":
      return "Partial on site";
    case "on_site":
      return "On site";
    case "installed":
      return "Installed";
  }
}

export function MaterialsView() {
  const jobsite = useJobsiteStore((s) => s.jobsite);
  const addMaterial = useJobsiteStore((s) => s.addMaterial);
  const updateMaterial = useJobsiteStore((s) => s.updateMaterial);
  const removeMaterial = useJobsiteStore((s) => s.removeMaterial);
  const setView = useJobsiteStore((s) => s.setView);

  const lines = jobsite.materials ?? [];
  const totals = useMemo(() => materialsTotals(lines), [lines]);
  const overBudget =
    jobsite.materialsBudget != null &&
    totals.budget > jobsite.materialsBudget;

  const [name, setName] = useState("");
  const [division, setDivision] = useState<TradeDivision>("materials");
  const [unit, setUnit] = useState("ea");
  const [qtyRequired, setQtyRequired] = useState(1);
  const [qtyOnHand, setQtyOnHand] = useState(0);
  const [unitCost, setUnitCost] = useState(0);
  const [status, setStatus] = useState<MaterialStatus>("needed");
  const [specNote, setSpecNote] = useState("");
  const [vendorContactId, setVendorContactId] = useState("");
  const [scheduleTaskId, setScheduleTaskId] = useState("");
  const [filter, setFilter] = useState<"all" | "short" | "needed">("all");

  const filtered = lines.filter((m) => {
    if (filter === "short") return m.qtyOnHand < m.qtyRequired;
    if (filter === "needed")
      return m.status === "needed" || m.status === "quoted" || m.status === "ordered";
    return true;
  });

  function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Material name is required.");
      return;
    }
    addMaterial({
      name: name.trim(),
      division,
      unit,
      qtyRequired,
      qtyOnHand,
      unitCost,
      status,
      specNote: specNote.trim() || undefined,
      vendorContactId: vendorContactId || undefined,
      scheduleTaskId: scheduleTaskId || undefined,
    });
    setName("");
    setSpecNote("");
    setQtyOnHand(0);
    toast.success("Material line added.");
  }

  return (
    <div className="animate-enter space-y-4 sm:space-y-6">
      <header className="space-y-2">
        <span className="lpin-chip">
          <Package className="size-3" />
          Materials · pricing
        </span>
        <h1 className="font-display text-2xl font-medium tracking-tight text-fg sm:text-3xl">
          Materials & sourcing
        </h1>
        <p className="text-sm text-fg-muted text-pretty">
          Track quantities, unit pricing, and status against the schedule and
          contract specs. Field can see what is short and who supplies it — stay
          inside project allowances.
        </p>
      </header>

      <div className="kpi-grid">
        <div className="kpi-card">
          <span className="kpi-value text-base sm:text-lg">
            {money(totals.budget)}
          </span>
          <span className="kpi-label">Materials budget (lines)</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value text-base sm:text-lg">
            {money(totals.onHandValue)}
          </span>
          <span className="kpi-label">On-hand value</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value text-disputed">{totals.shortQtyLines}</span>
          <span className="kpi-label">Short quantity</span>
        </div>
        <div className="kpi-card">
          <span className="kpi-value">{totals.neededLines}</span>
          <span className="kpi-label">Need order / quote</span>
        </div>
      </div>

      {jobsite.materialsBudget != null ? (
        <p
          className={cn(
            "rounded-xl border px-3 py-2 text-xs text-pretty",
            overBudget
              ? "border-disputed/40 bg-disputed/10 text-disputed"
              : "border-supported/30 bg-supported/10 text-supported",
          )}
        >
          Contract materials ceiling: {money(jobsite.materialsBudget)}
          {overBudget
            ? " — line total exceeds ceiling; review before buy-out."
            : " — line total within ceiling."}
        </p>
      ) : (
        <p className="text-xs text-fg-subtle text-pretty">
          Set a materials budget under Jobsite setup to track against contract
          allowances. Load an industry schedule to seed typical materials.
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["all", "All"],
            ["short", "Short qty"],
            ["needed", "Need buy"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setFilter(id)}
            className={cn(
              "min-h-10 rounded-full border px-3 text-sm font-medium",
              filter === id
                ? "btn-sunrise border-transparent text-accent-fg"
                : "border-border bg-surface-1 text-fg-muted",
            )}
          >
            {label}
          </button>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setView("schedule")}
        >
          Open schedule
        </Button>
      </div>

      <section className="space-y-3">
        {filtered.length === 0 ? (
          <div className="card-lpin rounded-2xl border-dashed px-4 py-10 text-center">
            <p className="text-sm text-fg">No material lines yet</p>
            <p className="mt-1 text-xs text-fg-muted">
              Load an industry schedule from Jobsite setup or Schedule, or add a
              line below.
            </p>
          </div>
        ) : (
          filtered.map((m) => {
            const short = m.qtyOnHand < m.qtyRequired;
            const vendor = (jobsite.contacts ?? []).find(
              (c) => c.id === m.vendorContactId,
            );
            const task = (jobsite.schedule ?? []).find(
              (s) => s.id === m.scheduleTaskId,
            );
            const lineTotal = materialLineCost(m);
            return (
              <article
                key={m.id}
                className={cn(
                  "card-lpin rounded-2xl p-4",
                  short && "border-unproven/35",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="default">{statusLabel(m.status)}</Badge>
                  <Badge variant="default">{divisionLabel(m.division)}</Badge>
                  {short ? (
                    <Badge variant="p1">
                      Short {m.qtyRequired - m.qtyOnHand} {m.unit}
                    </Badge>
                  ) : null}
                </div>
                <h3 className="mt-2 text-sm font-medium text-fg">{m.name}</h3>
                <p className="mt-1 text-xs text-fg-subtle">
                  {m.qtyOnHand}/{m.qtyRequired} {m.unit} · unit{" "}
                  {money(m.quotedUnitCost ?? m.unitCost)}
                  {m.quotedUnitCost != null ? " (quoted)" : " (budget)"} · line{" "}
                  {money(lineTotal)}
                </p>
                {m.specNote ? (
                  <p className="mt-1 text-xs text-fg-muted text-pretty">
                    Spec: {m.specNote}
                  </p>
                ) : null}
                <p className="mt-1 text-[11px] text-fg-subtle text-pretty">
                  {vendor ? `Vendor: ${vendor.company}` : "No vendor linked"}
                  {task ? ` · Schedule: ${task.title}` : ""}
                  {m.poNote ? ` · ${m.poNote}` : ""}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(
                    [
                      "needed",
                      "quoted",
                      "ordered",
                      "partial",
                      "on_site",
                      "installed",
                    ] as MaterialStatus[]
                  ).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => updateMaterial(m.id, { status: st })}
                      className={cn(
                        "min-h-9 rounded-lg border px-2 text-[11px] font-medium",
                        m.status === st
                          ? "border-[color-mix(in_oklab,var(--color-gold)_40%,var(--color-border))] bg-surface-2 text-fg"
                          : "border-border bg-surface-1 text-fg-muted",
                      )}
                    >
                      {statusLabel(st)}
                    </button>
                  ))}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      const next = Math.min(m.qtyRequired, m.qtyOnHand + 1);
                      updateMaterial(m.id, {
                        qtyOnHand: next,
                        status:
                          next >= m.qtyRequired
                            ? "on_site"
                            : next > 0
                              ? "partial"
                              : m.status,
                      });
                    }}
                  >
                    +1 on hand
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      removeMaterial(m.id);
                      toast.message("Material line removed.");
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

      <form onSubmit={onAdd} className="card-lpin space-y-3 rounded-2xl p-4">
        <p className="text-sm font-medium text-fg">Add material line</p>
        <label className="block space-y-1">
          <span className="text-xs text-fg-subtle">Name</span>
          <input
            className="field-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Type X drywall 5/8"
          />
        </label>
        <div className="grid gap-2 sm:grid-cols-3">
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
            <span className="text-xs text-fg-subtle">Unit</span>
            <input
              className="field-input"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="ea, sf, lf, cy"
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Status</span>
            <select
              className="field-input"
              value={status}
              onChange={(e) => setStatus(e.target.value as MaterialStatus)}
            >
              <option value="needed">Needed</option>
              <option value="quoted">Quoted</option>
              <option value="ordered">Ordered</option>
              <option value="partial">Partial on site</option>
              <option value="on_site">On site</option>
              <option value="installed">Installed</option>
            </select>
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Qty required</span>
            <input
              type="number"
              min={0}
              className="field-input"
              value={qtyRequired}
              onChange={(e) => setQtyRequired(Number(e.target.value))}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Qty on hand</span>
            <input
              type="number"
              min={0}
              className="field-input"
              value={qtyOnHand}
              onChange={(e) => setQtyOnHand(Number(e.target.value))}
            />
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Unit cost (USD)</span>
            <input
              type="number"
              min={0}
              step={0.01}
              className="field-input"
              value={unitCost}
              onChange={(e) => setUnitCost(Number(e.target.value))}
            />
          </label>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Vendor</span>
            <select
              className="field-input"
              value={vendorContactId}
              onChange={(e) => setVendorContactId(e.target.value)}
            >
              <option value="">— none —</option>
              {(jobsite.contacts ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-xs text-fg-subtle">Schedule task</span>
            <select
              className="field-input"
              value={scheduleTaskId}
              onChange={(e) => setScheduleTaskId(e.target.value)}
            >
              <option value="">— none —</option>
              {(jobsite.schedule ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-fg-subtle">
            Spec / contract note
          </span>
          <input
            className="field-input"
            value={specNote}
            onChange={(e) => setSpecNote(e.target.value)}
            placeholder="Division / section / no-substitutions"
          />
        </label>
        <Button type="submit" className="w-full">
          <Plus />
          Add material line
        </Button>
      </form>
    </div>
  );
}
