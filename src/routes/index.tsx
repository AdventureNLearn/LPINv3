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
      <main className="mx-auto w-full max-w-lg px-3 py-6 sm:max-w-2xl sm:px-6 sm:py-10">
        <section className="lpin-banner relative mb-5 aspect-[3/1] w-full overflow-hidden">
          <img
            src="/lpin/banner-lpin-x.jpg"
            alt="LPINv3 — construction and claims tools"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
        </section>

        <section className="mb-6 space-y-3">
          <span className="lpin-chip">
            <HardHat className="size-3" />
            LPINv3 · mobile field edition
          </span>
          <h1 className="font-display text-3xl font-medium tracking-tight text-fg text-balance">
            LPINv3
            <span className="text-gold">
              {" "}
              for the jobsite and the claims desk
            </span>
          </h1>
          <p className="text-sm leading-relaxed text-fg-muted text-pretty">
            Phone-first field board with live site map, dual comms log, and
            honest status — no fake “all clear.” Data stays on this device until
            you export a pack.
          </p>
        </section>

        <section className="lpin-banner relative mb-8 h-24 w-full overflow-hidden sm:h-28">
          <img
            src="/lpin/banner-shell-sunrise.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover object-[center_55%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-bg/40 via-transparent to-bg/40" />
        </section>

        <section className="grid gap-4">
          <AppCard
            to="/jobsite"
            kicker="LPINv3 · Jobsite"
            name="Jobsite"
            pitch="Priority stack, BD lane + field comms, inspections, materials, contacts, MapLibre site map with pin/draw/GPS."
            points={[
              "Board · Log · Plan · Map · More",
              "All-clear blocked while P0 is open",
              "Device-local geometry + GeoJSON export",
            ]}
            icon={<Signal className="size-5" />}
            cta="Open Jobsite"
            accent
          />
          <AppCard
            to="/claims"
            kicker="LPINv3 · Claims"
            name="Claims"
            pitch="Score only Supported, Unproven, or Disputed. Clean share only when disputes clear."
            points={[
              "Tri-state scoring",
              "Evidence / Inference / Assumption basis",
              "Human final call",
            ]}
            icon={<FileSearch className="size-5" />}
            cta="Open Claims"
          />
        </section>

        <HarborRulesCard className="mt-8" />

        <section className="mt-8 flex flex-col items-center gap-3 pb-8 text-center">
          <p className="flex items-center gap-2 text-sm text-fg-subtle">
            <ClipboardCheck className="size-3.5 text-gold" />
            No accounts · sample board ready immediately
          </p>
          <Button asChild className="w-full max-w-sm">
            <Link to="/jobsite">
              <HardHat className="size-4" />
              Open Jobsite
              <ArrowRight className="size-4" />
            </Link>
          </Button>
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
  accent?: boolean;
}) {
  return (
    <article
      className={
        accent
          ? "card-lpin flex flex-col rounded-2xl p-5 ring-1 ring-[color-mix(in_oklab,var(--color-gold)_28%,transparent)]"
          : "card-lpin flex flex-col rounded-2xl p-5"
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
