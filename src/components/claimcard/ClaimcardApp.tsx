import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  FileText,
  Flag,
  Home,
  Info,
  Link2,
  ListChecks,
  Loader2,
  RotateCcw,
  Share2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import {
  HarborRulesCard,
  IntegrityNotice,
} from "@/components/integrity/HarborRules";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  BASIS_KIND_HELP,
  BASIS_KIND_LABEL,
  CLAIMCARD_KERNEL_LINES,
  PUBLIC_FOOTER,
} from "@/lib/integrity";
import {
  buildMarkdownPack,
  claimKindLabel,
  evaluateLayer0,
  scoreLabel,
} from "@/lib/claimcard/domain";
import { resolveXPost } from "@/lib/claimcard/fetch-x";
import { looksLikeXUrl } from "@/lib/claimcard/parse-url";
import { useClaimcardStore } from "@/lib/claimcard/store";
import type {
  BasisKind,
  Claim,
  ClaimPack,
  ClaimScore,
} from "@/lib/claimcard/types";
import { cn } from "@/lib/utils";

export function ClaimcardApp() {
  const step = useClaimcardStore((s) => s.step);
  const pack = useClaimcardStore((s) => s.pack);

  return (
    <AppShell
      active="claims"
      mobileNav={pack ? <ClaimsBottomNav /> : undefined}
    >
      <main className="mx-auto w-full max-w-2xl px-3 py-4 sm:max-w-3xl sm:px-6 sm:py-10 lg:max-w-5xl">
        {step === "home" || !pack ? (
          <HomeStep />
        ) : step === "board" ? (
          <BoardStep />
        ) : (
          <ShareStep />
        )}
      </main>
    </AppShell>
  );
}

function ClaimsBottomNav() {
  const step = useClaimcardStore((s) => s.step);
  const setStep = useClaimcardStore((s) => s.setStep);
  const reset = useClaimcardStore((s) => s.reset);
  const pack = useClaimcardStore((s) => s.pack);
  const status = useMemo(
    () => (pack ? evaluateLayer0(pack.claims) : null),
    [pack],
  );

  const items = [
    {
      id: "home" as const,
      label: "New",
      icon: <Home className="size-5" />,
      onClick: () => reset(),
      active: false,
    },
    {
      id: "board" as const,
      label: "Score",
      icon: <ListChecks className="size-5" />,
      onClick: () => setStep("board"),
      active: step === "board",
      badge: status?.openDisputes.length ?? 0,
    },
    {
      id: "share" as const,
      label: "Share",
      icon: <Share2 className="size-5" />,
      onClick: () => setStep("share"),
      active: step === "share",
    },
  ];

  return (
    <nav
      className="bottom-nav"
      style={{ ["--bottom-nav-cols" as string]: "3" }}
      aria-label="Claims steps"
    >
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="bottom-nav-item relative"
          data-active={item.active}
          onClick={item.onClick}
        >
          <span className="relative">
            {item.icon}
            {"badge" in item && item.badge && item.badge > 0 ? (
              <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-disputed px-1 text-[9px] font-semibold text-white">
                {item.badge}
              </span>
            ) : null}
          </span>
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function ScoreKey() {
  return (
    <details className="card-lpin rounded-xl">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 py-3 text-sm font-medium text-fg-muted [&::-webkit-details-marker]:hidden">
        <Info className="size-4 shrink-0 text-gold" />
        How scoring works (integrity kernel)
      </summary>
      <ul className="space-y-2 border-t border-border px-4 py-3 text-xs leading-relaxed text-fg-muted">
        {CLAIMCARD_KERNEL_LINES.map((line) => (
          <li key={line} className="text-pretty">
            {line}
          </li>
        ))}
      </ul>
    </details>
  );
}

function HomeStep() {
  const loadExample = useClaimcardStore((s) => s.loadExample);
  const createFromPaste = useClaimcardStore((s) => s.createFromPaste);
  const createFromFetched = useClaimcardStore((s) => s.createFromFetched);
  const [url, setUrl] = useState("");
  const [handle, setHandle] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    author: string;
    handle: string;
    text: string;
    source: string;
  } | null>(null);

  async function pullFromLink() {
    const raw = url.trim();
    if (!raw) {
      toast.error("Paste an X (Twitter) post link first.");
      return;
    }
    if (!looksLikeXUrl(raw)) {
      toast.error(
        "Use a full post link, for example https://x.com/user/status/123…",
      );
      return;
    }
    setLoading(true);
    setFetchError(null);
    setPreview(null);
    try {
      const post = await resolveXPost({ data: { url: raw } });
      setPreview({
        author: post.authorName,
        handle: post.authorHandle
          ? `@${post.authorHandle.replace(/^@/, "")}`
          : "",
        text: post.text,
        source: post.fetchSource,
      });
      setText(post.text);
      if (post.authorHandle) {
        setHandle(`@${post.authorHandle.replace(/^@/, "")}`);
      }
      createFromFetched(post);
      toast.success("Post loaded. Review every score yourself.");
    } catch (e) {
      const msg =
        e instanceof Error
          ? e.message
          : "Could not load that post. Paste the text manually.";
      setFetchError(msg);
      toast.error("Could not pull that link — paste the text below if needed.");
    } finally {
      setLoading(false);
    }
  }

  function onManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() && !url.trim()) {
      toast.error("Paste an X link or the post text.");
      return;
    }
    if (!text.trim() && looksLikeXUrl(url)) {
      void pullFromLink();
      return;
    }
    if (!text.trim()) {
      toast.error("Paste the post text, or use Pull from X link.");
      return;
    }
    createFromPaste({ postUrl: url, postText: text, authorHandle: handle });
    toast.success(
      "Claim pack built. Each claim starts Unproven until you score it.",
    );
  }

  return (
    <div className="animate-enter space-y-5 sm:space-y-8">
      <header className="space-y-3">
        <span className="lpin-chip">
          <Sparkles className="size-3" />
          LPIN Suite · Claims
        </span>
        <h1 className="font-display text-2xl font-medium tracking-tight text-fg text-balance sm:text-4xl">
          Paste an X link.
          <br />
          <span className="text-gold">Score every claim by the light.</span>
        </h1>
        <p className="max-w-xl text-sm leading-relaxed text-fg-muted text-pretty sm:text-base">
          Pull the public post, split claims, score only Supported / Unproven /
          Disputed. Label basis as Evidence, Inference, or Assumption. Harbor
          rules: no fog, no fake certainty.
        </p>
      </header>

      <ScoreKey />
      <HarborRulesCard compact title="Harbor rules" />

      <form onSubmit={onManualSubmit} className="space-y-4">
        <div className="card-lpin space-y-4 rounded-2xl p-4 sm:p-6">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-medium text-fg">Start a claim pack</h2>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => {
                loadExample();
                toast.message("Loaded sample with open disputes.");
              }}
            >
              <Sparkles className="opacity-70" />
              Sample
            </Button>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">
              X / Twitter post link
            </span>
            <div className="relative">
              <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-gold" />
              <input
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setFetchError(null);
                }}
                placeholder="https://x.com/…/status/…"
                className="field-input pl-10"
                inputMode="url"
                autoComplete="off"
              />
            </div>
          </label>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              className="w-full sm:flex-1"
              disabled={loading}
              onClick={() => void pullFromLink()}
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <ExternalLink />
              )}
              {loading ? "Pulling…" : "Pull from X link"}
            </Button>
          </div>

          {fetchError ? (
            <p className="text-sm text-disputed text-pretty">{fetchError}</p>
          ) : null}

          {preview ? (
            <div className="rounded-xl border border-border bg-surface-1 px-3 py-2 text-xs text-fg-muted">
              <p className="font-medium text-fg">
                {preview.author} {preview.handle}
              </p>
              <p className="mt-1 line-clamp-3 text-pretty">{preview.text}</p>
              <p className="mt-1 text-fg-subtle">via {preview.source}</p>
            </div>
          ) : null}

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">
              Author handle (optional)
            </span>
            <input
              value={handle}
              onChange={(e) => setHandle(e.target.value)}
              placeholder="@handle"
              className="field-input"
              autoComplete="off"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-fg-muted">
              Post text (paste if the link won’t load)
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste the full post text…"
              className="field-input min-h-32"
            />
          </label>

          <Button type="submit" className="w-full" size="lg">
            Build claim pack
          </Button>
        </div>
      </form>
    </div>
  );
}

function ContextPanel({ pack }: { pack: ClaimPack }) {
  const ctx = pack.context;
  if (!ctx) return null;
  return (
    <section className="card-lpin space-y-3 rounded-2xl p-4">
      <h2 className="text-sm font-medium text-fg">Post context</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {ctx.authorName ? (
          <Meta label="Author">{ctx.authorName}</Meta>
        ) : null}
        {ctx.authorHandle ? (
          <Meta label="Handle">{ctx.authorHandle}</Meta>
        ) : null}
        {ctx.postedAt ? (
          <Meta label="Posted">{formatDate(ctx.postedAt)}</Meta>
        ) : null}
        {ctx.likes != null ? (
          <Meta label="Likes (not truth)">{fmtNum(ctx.likes)}</Meta>
        ) : null}
      </div>
      {ctx.verificationChecklist.length ? (
        <div>
          <p className="mb-1.5 text-xs font-medium text-gold">
            Verification checklist
          </p>
          <ul className="space-y-1 text-xs text-fg-muted">
            {ctx.verificationChecklist.map((item) => (
              <li key={item} className="flex gap-2 text-pretty">
                <span className="mt-1.5 size-1 shrink-0 rounded-full bg-gold" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

function Meta({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border/80 bg-surface-1 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-fg-subtle">
        {label}
      </p>
      <p className="mt-0.5 text-xs text-fg-muted text-pretty">{children}</p>
    </div>
  );
}

function BoardStep() {
  const pack = useClaimcardStore((s) => s.pack)!;
  const setStep = useClaimcardStore((s) => s.setStep);
  const reset = useClaimcardStore((s) => s.reset);
  const updateClaimScore = useClaimcardStore((s) => s.updateClaimScore);
  const toggleClaimHonesty = useClaimcardStore((s) => s.toggleClaimHonesty);
  const updateClaimBasis = useClaimcardStore((s) => s.updateClaimBasis);
  const updateClaimBasisKind = useClaimcardStore((s) => s.updateClaimBasisKind);

  const status = useMemo(() => evaluateLayer0(pack.claims), [pack.claims]);

  return (
    <div className="animate-enter space-y-5 sm:space-y-8">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => reset()}
            className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-gold"
          >
            <ArrowLeft className="size-4" />
            New pack
          </button>
          <h1 className="font-display text-2xl font-medium tracking-tight text-fg sm:text-3xl">
            Score claims
          </h1>
          <p className="max-w-lg text-sm text-fg-muted text-pretty">
            {pack.title}
          </p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => reset()}
          aria-label="Start over"
        >
          <RotateCcw className="size-4" />
        </Button>
      </div>

      <ScoreKey />
      <ContextPanel pack={pack} />

      {pack.postText ? (
        <blockquote className="card-lpin rounded-xl px-4 py-3 text-sm leading-relaxed text-fg-muted">
          <p className="whitespace-pre-wrap text-pretty">“{pack.postText}”</p>
        </blockquote>
      ) : null}

      <Histogram status={status} />

      <div className="grid gap-3 lg:grid-cols-2">
        {pack.claims.map((claim, i) => (
          <ClaimCard
            key={claim.id}
            claim={claim}
            index={i}
            onScore={(s) => updateClaimScore(claim.id, s)}
            onHonesty={() => toggleClaimHonesty(claim.id)}
            onBasis={(b) => updateClaimBasis(claim.id, b)}
            onBasisKind={(k) => updateClaimBasisKind(claim.id, k)}
          />
        ))}
      </div>

      <div className="sticky-action-bar">
        <div className="mb-2">
          {status.canShareClean ? (
            <p className="text-sm font-medium text-supported">
              No open disputes — clean share allowed
            </p>
          ) : (
            <p className="text-sm font-medium text-disputed">
              {status.openDisputes.length} open dispute
              {status.openDisputes.length === 1 ? "" : "s"} block clean share
            </p>
          )}
          <p className="text-xs text-fg-subtle">
            +1 {status.histogram.supported} · 0 {status.histogram.unproven} · −1{" "}
            {status.histogram.disputed}
            {" · "}E {status.basisHistogram.evidence} · I{" "}
            {status.basisHistogram.inference} · A{" "}
            {status.basisHistogram.assumption}
          </p>
        </div>
        <Button onClick={() => setStep("share")} size="lg" className="w-full">
          Review & share
          <Share2 />
        </Button>
      </div>
    </div>
  );
}

function ClaimCard({
  claim,
  index,
  onScore,
  onHonesty,
  onBasis,
  onBasisKind,
}: {
  claim: Claim;
  index: number;
  onScore: (s: ClaimScore) => void;
  onHonesty: () => void;
  onBasis: (b: string) => void;
  onBasisKind: (k: BasisKind) => void;
}) {
  const hasPrimary = claim.sources.some((s) => s.kind === "primary");
  const needsHonesty = claim.score === 1 && !hasPrimary;
  const basisKind = claim.basisKind ?? "unset";

  return (
    <article
      className={cn(
        "card-lpin flex flex-col rounded-2xl p-4 transition-colors",
        claim.score === -1
          ? "!border-disputed/35"
          : claim.score === 1
            ? "!border-supported/25"
            : "",
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-xs text-fg-subtle">#{claim.id}</span>
        <Badge
          variant={
            claim.score === 1
              ? "supported"
              : claim.score === -1
                ? "disputed"
                : "unproven"
          }
        >
          {scoreLabel(claim.score)}
        </Badge>
        {claim.kind ? (
          <Badge variant="default">{claimKindLabel(claim.kind)}</Badge>
        ) : null}
        {basisKind !== "unset" ? (
          <Badge variant="default">{BASIS_KIND_LABEL[basisKind]}</Badge>
        ) : null}
        {claim.honestyFlag ? (
          <Badge variant="honesty">
            <Flag className="size-3" />
            Honesty
          </Badge>
        ) : null}
      </div>

      <p className="mt-3 flex-1 text-base leading-relaxed text-fg text-pretty">
        {claim.text}
      </p>

      <div className="mt-4">
        <p className="mb-2 text-xs font-medium text-gold">Your score</p>
        <ScorePills value={claim.score} onChange={onScore} />
      </div>

      {needsHonesty && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-unproven">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          +1 without a primary source — consider the honesty flag.
        </p>
      )}

      <div className="mt-3 space-y-2">
        <div>
          <p className="mb-1.5 text-xs text-fg-subtle">
            Basis kind — {BASIS_KIND_HELP[basisKind]}
          </p>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {(
              [
                "evidence",
                "inference",
                "assumption",
                "unset",
              ] as BasisKind[]
            ).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onBasisKind(k)}
                className={cn(
                  "min-h-10 rounded-lg border px-2 text-[11px] font-medium transition-colors",
                  basisKind === k
                    ? "border-[color-mix(in_oklab,var(--color-gold)_45%,var(--color-border))] bg-[color-mix(in_oklab,var(--color-gold)_14%,var(--color-surface-2))] text-gold"
                    : "border-border bg-surface-1 text-fg-muted hover:text-fg",
                )}
                aria-pressed={basisKind === k}
              >
                {BASIS_KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </div>
        <label className="block space-y-1">
          <span className="text-xs text-fg-subtle">
            Why this score (optional)
          </span>
          <input
            value={claim.basis || ""}
            onChange={(e) => onBasis(e.target.value)}
            placeholder="e.g. statute §… or ‘not found yet’"
            className="field-input"
          />
        </label>
        <button
          type="button"
          onClick={onHonesty}
          className={cn(
            "flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border px-3 text-sm font-medium transition-colors",
            claim.honestyFlag
              ? "border-unproven/40 bg-unproven/15 text-unproven"
              : "border-border bg-surface-1 text-fg-muted",
          )}
        >
          <Flag className="size-3.5" />
          {claim.honestyFlag
            ? "Honesty flag on"
            : "Mark: plausible, not fully proven"}
        </button>
      </div>
    </article>
  );
}

function ScorePills({
  value,
  onChange,
}: {
  value: ClaimScore;
  onChange: (s: ClaimScore) => void;
}) {
  const opts: {
    score: ClaimScore;
    label: string;
    full: string;
    active: string;
  }[] = [
    {
      score: 1,
      label: "+1",
      full: "Supported",
      active: "bg-supported text-white border-supported",
    },
    {
      score: 0,
      label: "0",
      full: "Unproven",
      active: "bg-unproven text-ink border-unproven",
    },
    {
      score: -1,
      label: "−1",
      full: "Disputed",
      active: "bg-disputed text-white border-disputed",
    },
  ];
  return (
    <div
      className="grid grid-cols-3 gap-2"
      role="group"
      aria-label="Claim score"
    >
      {opts.map((o) => (
        <button
          key={o.score}
          type="button"
          onClick={() => onChange(o.score)}
          className={cn(
            "flex min-h-14 flex-col items-center justify-center rounded-xl border px-2 py-2 transition-colors active:scale-[0.98]",
            value === o.score
              ? o.active
              : "border-border bg-surface-1 text-fg-muted hover:bg-surface-2 hover:text-fg",
          )}
          aria-pressed={value === o.score}
          aria-label={`${o.full} (${o.label})`}
        >
          <span className="text-lg font-semibold tabular-nums leading-none">
            {o.label}
          </span>
          <span className="mt-1 text-[10px] font-medium leading-none opacity-90">
            {o.full}
          </span>
        </button>
      ))}
    </div>
  );
}

function Histogram({
  status,
}: {
  status: ReturnType<typeof evaluateLayer0>;
}) {
  const total =
    status.histogram.supported +
      status.histogram.unproven +
      status.histogram.disputed || 1;
  const segments = [
    {
      key: "s",
      n: status.histogram.supported,
      className: "bg-supported",
      label: "Supported",
    },
    {
      key: "u",
      n: status.histogram.unproven,
      className: "bg-unproven",
      label: "Unproven",
    },
    {
      key: "d",
      n: status.histogram.disputed,
      className: "bg-disputed",
      label: "Disputed",
    },
  ];
  return (
    <div className="card-lpin rounded-2xl p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-fg">Score mix</p>
        <p className="text-xs text-fg-subtle">
          {status.canShareClean ? "Clean gate open" : "Clean gate hold"}
        </p>
      </div>
      <div className="flex h-3 overflow-hidden rounded-full bg-surface-1">
        {segments.map((s) =>
          s.n > 0 ? (
            <div
              key={s.key}
              className={cn(s.className, "h-full")}
              style={{ width: `${(s.n / total) * 100}%` }}
              title={`${s.label}: ${s.n}`}
            />
          ) : null,
        )}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
        {segments.map((s) => (
          <div key={s.key}>
            <p className="font-semibold tabular-nums text-fg">{s.n}</p>
            <p className="text-fg-subtle">{s.label.split(" ")[0]}</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-center text-[11px] text-fg-subtle">
        Basis · Evidence {status.basisHistogram.evidence} · Inference{" "}
        {status.basisHistogram.inference} · Assumption{" "}
        {status.basisHistogram.assumption} · Unset{" "}
        {status.basisHistogram.unset}
      </p>
    </div>
  );
}

function ShareStep() {
  const pack = useClaimcardStore((s) => s.pack)!;
  const setStep = useClaimcardStore((s) => s.setStep);
  const reset = useClaimcardStore((s) => s.reset);
  const status = useMemo(() => evaluateLayer0(pack.claims), [pack.claims]);
  const [copied, setCopied] = useState(false);

  const markdown = useMemo(
    () => buildMarkdownPack(pack, status),
    [pack, status],
  );

  async function copy() {
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      toast.success("Copied to clipboard.");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy — select the text manually.");
    }
  }

  async function nativeShare() {
    if (!navigator.share) {
      await copy();
      return;
    }
    try {
      await navigator.share({
        title: pack.title,
        text: markdown,
      });
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div className="animate-enter space-y-5 sm:space-y-8">
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setStep("board")}
          className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-fg-muted hover:text-gold"
        >
          <ArrowLeft className="size-4" />
          Back to scores
        </button>
        <h1 className="font-display text-2xl font-medium tracking-tight text-fg sm:text-3xl">
          Share pack
        </h1>
        <p className="text-sm text-fg-muted text-pretty">{pack.title}</p>
      </div>

      <IntegrityNotice mode={status.canShareClean ? "clean" : "hold"}>
        {status.canShareClean ? (
          <p className="font-medium text-supported">
            Clean share gate open — no open −1 disputes. A person made every
            score.
          </p>
        ) : (
          <div className="space-y-1">
            <p className="font-medium text-disputed">
              Clean share blocked — {status.openDisputes.length} open dispute
              {status.openDisputes.length === 1 ? "" : "s"}.
            </p>
            <p className="text-xs text-fg-muted">
              You can still copy a hold-state summary that lists the gaps.
              Open gaps are never laundered into “clean.”
            </p>
          </div>
        )}
      </IntegrityNotice>

      <Histogram status={status} />
      <HarborRulesCard compact title="Harbor rules on share" />

      <div className="card-lpin rounded-2xl p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-fg">
          <FileText className="size-4 text-gold" />
          Share text (secular integrity footer)
        </div>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap rounded-xl border border-border bg-surface-1 p-3 font-mono text-xs leading-relaxed text-fg-muted">
          {markdown}
        </pre>
        <p className="mt-2 text-[11px] text-fg-subtle text-pretty">
          {PUBLIC_FOOTER.short}
        </p>
      </div>

      <div className="sticky-action-bar grid grid-cols-2 gap-2">
        <Button variant="secondary" className="w-full" onClick={() => void copy()}>
          {copied ? <Check /> : <Copy />}
          {copied ? "Copied" : "Copy"}
        </Button>
        <Button className="w-full" onClick={() => void nativeShare()}>
          <Share2 />
          Share
        </Button>
      </div>

      <Button variant="ghost" className="w-full" onClick={() => reset()}>
        <RotateCcw />
        Start a new pack
      </Button>
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}
