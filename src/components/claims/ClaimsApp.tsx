import { useState } from "react";
import { FileSearch, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  HarborRulesCard,
  IntegrityNotice,
} from "@/components/integrity/HarborRules";
import { Button } from "@/components/ui/button";
import { BASIS_KIND_LABEL, SCORE_GUIDE } from "@/lib/integrity";
import type { BasisKind, TriStateScore } from "@/lib/integrity";
import { hasDisputed, useClaimsStore } from "@/lib/claims/store";
import { cn } from "@/lib/utils";

export function ClaimsApp() {
  const sourceLabel = useClaimsStore((s) => s.sourceLabel);
  const setSourceLabel = useClaimsStore((s) => s.setSourceLabel);
  const claims = useClaimsStore((s) => s.claims);
  const addClaim = useClaimsStore((s) => s.addClaim);
  const updateClaim = useClaimsStore((s) => s.updateClaim);
  const removeClaim = useClaimsStore((s) => s.removeClaim);
  const resetDemo = useClaimsStore((s) => s.resetDemo);
  const [draft, setDraft] = useState("");
  const blocked = hasDisputed(claims);

  return (
    <AppShell active="claims" edition="mobile">
      <main className="mx-auto w-full max-w-lg px-3 py-4 sm:max-w-2xl sm:px-4">
        <span className="lpin-chip mb-3 inline-flex">
          <FileSearch className="size-3" />
          LPIN Suite · Claims
        </span>
        <h1 className="font-display text-2xl font-medium tracking-tight text-fg">
          Claims desk
        </h1>
        <p className="mt-1 text-sm text-fg-muted text-pretty">
          Score only Supported / Unproven / Disputed. Open gaps block clean
          share. A person owns every score.
        </p>

        <IntegrityNotice mode={blocked ? "hold" : "clean"} className="my-4">
          {blocked ? (
            <>
              At least one claim is <strong className="text-fg">−1 Disputed</strong>.
              Clean share is blocked until a human changes it.
            </>
          ) : (
            <>
              No disputed claims. You may still choose not to share — software
              does not invent “all clear.”
            </>
          )}
        </IntegrityNotice>

        <label className="mb-4 block space-y-1 text-xs text-fg-subtle">
          Source label
          <input
            className="field-input"
            value={sourceLabel}
            onChange={(e) => setSourceLabel(e.target.value)}
          />
        </label>

        <div className="mb-4 flex gap-2">
          <input
            className="field-input flex-1"
            placeholder="Add a claim sentence"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && draft.trim()) {
                addClaim(draft);
                setDraft("");
                toast.message("Claim added");
              }
            }}
          />
          <Button
            size="icon"
            disabled={!draft.trim()}
            onClick={() => {
              addClaim(draft);
              setDraft("");
              toast.message("Claim added");
            }}
            aria-label="Add claim"
          >
            <Plus className="size-4" />
          </Button>
        </div>

        <div className="space-y-3">
          {claims.map((c) => (
            <article key={c.id} className="card-lpin rounded-2xl p-4">
              <p className="text-sm font-medium text-fg text-pretty">{c.text}</p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {(
                  [
                    [1, "Supported", "supported"],
                    [0, "Unproven", "unproven"],
                    [-1, "Disputed", "disputed"],
                  ] as const
                ).map(([score, label, key]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      updateClaim(c.id, { score: score as TriStateScore })
                    }
                    className={cn(
                      "score-pad min-h-14 rounded-xl border px-1 py-2 text-center text-[11px] font-semibold",
                      c.score === score
                        ? key === "supported"
                          ? "border-supported/50 bg-supported/15 text-supported"
                          : key === "disputed"
                            ? "border-disputed/50 bg-disputed/15 text-disputed"
                            : "border-unproven/50 bg-unproven/15 text-unproven"
                        : "border-border bg-surface-1 text-fg-muted",
                    )}
                    data-active={c.score === score ? "true" : "false"}
                  >
                    {score > 0 ? "+1" : score}
                    <br />
                    {label}
                  </button>
                ))}
              </div>
              <label className="mt-3 block space-y-1 text-xs text-fg-subtle">
                Basis
                <select
                  className="field-input"
                  value={c.basis}
                  onChange={(e) =>
                    updateClaim(c.id, { basis: e.target.value as BasisKind })
                  }
                >
                  {(Object.keys(BASIS_KIND_LABEL) as BasisKind[]).map((b) => (
                    <option key={b} value={b}>
                      {BASIS_KIND_LABEL[b]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-2 block space-y-1 text-xs text-fg-subtle">
                Note
                <textarea
                  className="field-input min-h-20"
                  value={c.note}
                  onChange={(e) => updateClaim(c.id, { note: e.target.value })}
                  placeholder="Why this score"
                />
              </label>
              <Button
                size="sm"
                variant="ghost"
                className="mt-2 text-disputed"
                onClick={() => removeClaim(c.id)}
              >
                <Trash2 className="size-3.5" />
                Remove
              </Button>
            </article>
          ))}
        </div>

        <div className="mt-6 space-y-3 text-xs text-fg-subtle">
          <p>{SCORE_GUIDE.supported}</p>
          <p>{SCORE_GUIDE.unproven}</p>
          <p>{SCORE_GUIDE.disputed}</p>
        </div>

        <Button
          variant="secondary"
          className="mt-4 w-full"
          onClick={() => {
            resetDemo();
            toast.message("Demo claims restored");
          }}
        >
          Reset demo claims
        </Button>

        <HarborRulesCard className="mt-6" compact />
      </main>
    </AppShell>
  );
}
