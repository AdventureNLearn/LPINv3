/**
 * Visible scale-test surfaces: org · field comms · national vendors.
 * Shown so multi-window portfolio demos have something real to inspect.
 */

import { useMemo, useState } from "react";
import {
  Building2,
  FileSignature,
  Layers,
  MessageSquare,
  Network,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useJobsiteStore } from "@/lib/jobsite/store";
import { cn } from "@/lib/utils";

export function ScaleTestSurfaces({ compact }: { compact?: boolean }) {
  const jobsite = useJobsiteStore((s) => s.jobsite);
  const org = jobsite.org;
  const fieldComms = jobsite.fieldComms;
  const nationals = jobsite.nationalVendors ?? [];
  const [divFilter, setDivFilter] = useState("");
  const [tab, setTab] = useState<"comms" | "org" | "national">("comms");

  const messages = fieldComms?.messages ?? [];
  const divisions = useMemo(() => {
    const set = new Set(messages.map((m) => m.division));
    return [...set].sort();
  }, [messages]);

  const filtered = useMemo(() => {
    if (!divFilter) return messages;
    return messages.filter(
      (m) =>
        m.division === divFilter || m.scopes?.includes(divFilter),
    );
  }, [messages, divFilter]);

  if (!org && messages.length === 0 && nationals.length === 0) {
    return (
      <section className="card-lpin rounded-2xl p-4">
        <p className="text-xs text-fg-muted">
          Scale-test data not on this board yet — open a portfolio project
          (seed v6+) from the workspace bar.
        </p>
      </section>
    );
  }

  return (
    <section className="card-lpin space-y-3 rounded-2xl p-3 sm:p-4">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gold">
            Scale test surfaces
          </p>
          <h3 className="text-sm font-semibold text-fg sm:text-base">
            Org · Comms · National vendors
          </h3>
          <p className="text-[11px] text-fg-subtle">
            {fieldComms?.fullMessageCount
              ? `${fieldComms.fullMessageCount.toLocaleString()} full · ${messages.length} sample`
              : `${messages.length} field msgs`}
            {fieldComms?.mode === "interval_15m" ? " · 15-min logs" : ""}
            {" · "}
            {org?.divisions?.length ?? 0} divs · {org?.contracts?.length ?? 0}{" "}
            contracts · {nationals.length} nationals
            {fieldComms?.timeline
              ? ` · ${fieldComms.timeline.durationCalendarDays}d / ${fieldComms.timeline.fieldWorkDays} field days`
              : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(
            [
              ["comms", "Comms", MessageSquare],
              ["org", "Org", Layers],
              ["national", "National", Network],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={cn(
                "inline-flex min-h-9 items-center gap-1 rounded-full px-3 text-xs font-medium",
                tab === id
                  ? "btn-sunrise text-accent-fg"
                  : "bg-surface-1 text-fg-muted",
              )}
            >
              <Icon className="size-3.5" />
              {label}
            </button>
          ))}
        </div>
      </header>

      {tab === "comms" ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setDivFilter("")}
              className={cn(
                "rounded-full px-2.5 py-1 text-[10px] font-medium",
                !divFilter ? "btn-sunrise text-accent-fg" : "bg-surface-1 text-fg-muted",
              )}
            >
              All
            </button>
            {divisions.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDivFilter(d)}
                className={cn(
                  "rounded-full px-2.5 py-1 font-mono text-[10px] font-medium",
                  divFilter === d
                    ? "btn-sunrise text-accent-fg"
                    : "bg-surface-1 text-fg-muted",
                )}
              >
                {d}
              </button>
            ))}
          </div>
          <ol
            className={cn(
              "space-y-2 overflow-y-auto pr-1",
              compact ? "max-h-56" : "max-h-96",
            )}
          >
            {filtered.slice(0, compact ? 12 : 40).map((m, i) => (
              <li
                key={m.id}
                className="rounded-xl border border-border bg-surface-1 px-3 py-2"
              >
                <div className="mb-1 flex flex-wrap items-center gap-1">
                  <span className="font-mono text-[10px] text-fg-subtle">
                    #{i + 1}
                  </span>
                  <Badge className="border-0 bg-gold/10 text-[10px] text-gold">
                    {m.division}
                  </Badge>
                  <Badge className="border-0 bg-surface text-[10px] text-fg-muted">
                    {m.phase}
                  </Badge>
                  <Badge className="border-0 bg-surface text-[10px] text-fg-muted">
                    {m.kind}
                  </Badge>
                  {m.vendorId ? (
                    <span className="font-mono text-[9px] text-fg-subtle">
                      {m.vendorId}/{m.contractId}
                    </span>
                  ) : null}
                </div>
                <p className="text-[11px] text-fg-muted">
                  {m.fromName} → {m.toNames?.join(", ")}
                </p>
                <p className="mt-0.5 text-xs leading-snug text-fg">{m.text}</p>
              </li>
            ))}
            {filtered.length === 0 ? (
              <li className="py-6 text-center text-xs text-fg-subtle">
                No messages for this division filter.
              </li>
            ) : null}
          </ol>
          {filtered.length > (compact ? 12 : 40) ? (
            <p className="text-[10px] text-fg-subtle">
              Showing {compact ? 12 : 40} of {filtered.length}
            </p>
          ) : null}
        </div>
      ) : null}

      {tab === "org" && org ? (
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gold">
              <Users className="size-3" /> People
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {org.people?.slice(0, 12).map((p) => (
                <li
                  key={p.id}
                  className="rounded-lg border border-border px-2 py-1.5 text-[11px]"
                >
                  <span className="font-medium text-fg">{p.name}</span>
                  <span className="block text-fg-subtle">
                    {p.title} · {p.company}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gold">
              <Layers className="size-3" /> Divisions
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {org.divisions?.map((d) => (
                <li
                  key={d.code}
                  className="flex justify-between gap-2 rounded-lg border border-border px-2 py-1 font-mono text-[11px]"
                >
                  <span>{d.code}</span>
                  <span className="truncate text-fg-muted">{d.name}</span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <p className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-gold">
              <FileSignature className="size-3" /> Contracts
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto">
              {org.contracts?.map((c) => (
                <li
                  key={c.id}
                  className="rounded-lg border border-border px-2 py-1.5 text-[11px]"
                >
                  <span className="font-mono text-[10px] text-fg-subtle">
                    {c.id}
                  </span>
                  <span className="block font-medium text-fg">{c.name}</span>
                  <span className="block text-fg-subtle">
                    {c.contractor} · Div {c.divisions?.join(",")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}

      {tab === "national" ? (
        <ul className="max-h-72 space-y-1.5 overflow-y-auto">
          {nationals.length === 0 ? (
            <li className="py-6 text-center text-xs text-fg-subtle">
              No national vendors on this board.
            </li>
          ) : (
            nationals.map((v) => (
              <li
                key={v.id}
                className="rounded-xl border border-border bg-surface-1 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Building2 className="size-3.5 text-gold" />
                  <span className="text-sm font-medium text-fg">{v.name}</span>
                  <Badge className="border-0 bg-surface text-[10px] text-fg-muted">
                    {v.category}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[10px] text-fg-subtle">
                  {(v.affinity ?? []).join(" · ")} — {v.reason}
                </p>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </section>
  );
}
