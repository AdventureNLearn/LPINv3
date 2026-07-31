import { Scale, Shield } from "lucide-react";
import { HARBOR_RULES, PUBLIC_FOOTER } from "@/lib/integrity";
import { cn } from "@/lib/utils";

/** Shared secular integrity card — skills complement; no spine tokens. */
export function HarborRulesCard({
  className,
  title = "Working rules",
  compact,
}: {
  className?: string;
  title?: string;
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        compact
          ? "card-lpin rounded-xl px-4 py-4"
          : "card-lpin-glow rounded-2xl px-5 py-6 sm:px-8",
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <span className="lpin-icon shrink-0">
          <Scale className="size-5" />
        </span>
        <div className="min-w-0 space-y-2">
          <h2 className="text-base font-medium text-fg">{title}</h2>
          <p className="text-xs text-fg-subtle">
            Honest boards only — no fake complete picture
          </p>
          <ul className="space-y-1.5 text-sm leading-relaxed text-fg-muted">
            {HARBOR_RULES.map((r) => (
              <li key={r.id} className="text-pretty">
                {r.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Compact notice for clean-share / all-clear moments. */
export function IntegrityNotice({
  mode,
  children,
  className,
}: {
  mode: "clean" | "hold";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4",
        mode === "clean"
          ? "border-supported/35 bg-supported/10"
          : "border-disputed/35 bg-disputed/10",
        className,
      )}
    >
      <div className="flex items-start gap-2">
        <Shield
          className={cn(
            "mt-0.5 size-4 shrink-0",
            mode === "clean" ? "text-supported" : "text-disputed",
          )}
        />
        <div className="min-w-0 text-sm text-pretty">{children}</div>
      </div>
    </div>
  );
}

export function PublicFooterLines({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-1 text-center text-xs text-fg-subtle", className)}>
      <p className="text-pretty">{PUBLIC_FOOTER.short}</p>
      <p className="text-pretty">{PUBLIC_FOOTER.product}</p>
    </div>
  );
}
