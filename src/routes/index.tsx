import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  ClipboardCheck,
  FileSearch,
  HardHat,
  Signal,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { HarborRulesCard } from "@/components/integrity/HarborRules";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: HomePage,
});

function HomePage() {
  return (
    <AppShell active="home">
      <main className="mx-auto w-full max-w-5xl px-3 py-6 sm:px-6 sm:py-12">
        <section className="lpin-banner relative mb-5 aspect-[3/1] w-full sm:mb-8">
          <img
            src="/lpin/banner-lpin-x.jpg"
            alt="LPIN Suite — construction and claims tools"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </section>

        <section className="mb-6 space-y-3 sm:mb-10">
          <span className="lpin-chip">
            <HardHat className="size-3" />
            LPIN Suite · open tools
          </span>
          <h1 className="max-w-2xl font-display text-3xl font-medium tracking-tight text-fg text-balance sm:text-4xl lg:text-5xl">
            LPIN Suite
            <span className="text-gold"> for the jobsite and the claims desk</span>
          </h1>
          <p className="max-w-xl text-sm leading-relaxed text-fg-muted text-pretty sm:text-base">
            Light · Proof · Integrity · Navigation. Built for superintendents,
            project managers, owners, and anyone who needs a clear board — on
            the phone in the field or on a desk in the trailer. No jargon fog.
            No fake “all clear.” A person owns every status.
          </p>
        </section>

        <section className="lpin-banner relative mb-8 h-24 w-full overflow-hidden sm:mb-10 sm:h-32">
          <img
            src="/lpin/banner-shell-sunrise.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[center_55%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-bg/40 via-transparent to-bg/40" />
        </section>

        <section className="mx-auto mb-8 max-w-2xl text-center sm:mb-10">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-gold">
            Suite apps · United States first
          </p>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-fg-muted text-pretty">
            Score public claims without fake certainty, or run a jobsite priority
            board with building-department messages, inspections, schedules, and
            materials. Data stays on this device until you export a pack. More
            apps will join this suite over time.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <AppCard
            to="/claims"
            kicker="LPIN Suite · Claims"
            name="Claims"
            pitch="Paste a public post link. Break it into claims. Score only Supported, Unproven, or Disputed — hold a clean share until open gaps are closed."
            points={[
              "Pull a public post from a link",
              "Evidence / Inference / Assumption basis",
              "Clean share only when disputes clear",
            ]}
            icon={<FileSearch className="size-5" />}
            cta="Open Claims"
          />
          <AppCard
            to="/jobsite"
            kicker="LPIN Suite · Jobsite"
            name="Jobsite"
            pitch="Field reports, messages to the building department lane, inspection scheduling, industry schedules, and materials — wired so stop-work items never hide under a green dashboard."
            points={[
              "Phone-first reporting · desk view on PC",
              "All-clear blocked while P0 is open",
              "Schedule · materials · open packs",
            ]}
            icon={<Signal className="size-5" />}
            cta="Open Jobsite"
            accent="wave"
          />
        </section>

        <HarborRulesCard className="mx-auto mt-10 max-w-2xl" />

        <section className="mt-10 flex flex-col items-center gap-3 text-center">
          <p className="flex items-center gap-2 text-sm text-fg-subtle">
            <ClipboardCheck className="size-3.5 text-gold" />
            No accounts · sample boards ready in under a minute
          </p>
          <div className="flex w-full max-w-sm flex-col gap-2 sm:max-w-none sm:flex-row sm:justify-center">
            <Button asChild className="w-full sm:w-auto">
              <Link to="/jobsite">
                <HardHat className="size-4" />
                Open Jobsite
              </Link>
            </Button>
            <Button asChild variant="secondary" className="w-full sm:w-auto">
              <Link to="/claims">
                <FileSearch className="size-4" />
                Open Claims
              </Link>
            </Button>
          </div>
        </section>
      </main>
    </AppShell>
  );
}

function AppCard({
  to,
  kicker,
  name,
  pitch,
  points,
  icon,
  cta,
  accent,
}: {
  to: "/claims" | "/jobsite";
  kicker: string;
  name: string;
  pitch: string;
  points: string[];
  icon: React.ReactNode;
  cta: string;
  accent?: "wave";
}) {
  return (
    <article
      className={
        accent === "wave"
          ? "card-lpin flex flex-col rounded-2xl p-5 ring-1 ring-[color-mix(in_oklab,var(--color-gold)_28%,transparent)] sm:p-6"
          : "card-lpin flex flex-col rounded-2xl p-5 sm:p-6"
      }
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-gold">
            {kicker}
          </p>
          <h2 className="mt-1 font-display text-2xl font-medium tracking-tight text-fg">
            {name}
          </h2>
        </div>
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-surface-2 text-gold ring-1 ring-border">
          {icon}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-fg-muted text-pretty">{pitch}</p>
      <ul className="mt-4 space-y-2 text-sm text-fg-muted">
        {points.map((p) => (
          <li key={p} className="flex gap-2">
            <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-gold" />
            <span className="text-pretty">{p}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Button asChild className="w-full">
          <Link to={to}>
            {cta}
            <ArrowRight className="size-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
