import { Link } from "@tanstack/react-router";
import { ExternalLink, HardHat, PanelRightOpen } from "lucide-react";
import { PublicFooterLines } from "@/components/integrity/HarborRules";
import { cn } from "@/lib/utils";

/** Open a suite route in a separate browser window (desktop multi-window workflow). */
export function openSuiteWindow(
  path: string,
  opts?: { width?: number; height?: number; name?: string },
) {
  if (typeof window === "undefined") return;
  const url = new URL(path, window.location.origin).toString();
  const w = opts?.width ?? 1280;
  const h = opts?.height ?? 900;
  const left = Math.max(0, Math.round((window.screen.width - w) / 2));
  const top = Math.max(0, Math.round((window.screen.height - h) / 2));
  window.open(
    url,
    opts?.name ?? `lpin-${path.replace(/[^\w-]+/g, "-")}`,
    `noopener,noreferrer,width=${w},height=${h},left=${left},top=${top}`,
  );
}

export function AppShell({
  children,
  active,
  mobileNav,
  hideFooter,
}: {
  children: React.ReactNode;
  active?: "home" | "claims" | "jobsite";
  mobileNav?: React.ReactNode;
  hideFooter?: boolean;
}) {
  const hasBottomNav = Boolean(mobileNav);

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col bg-bg text-fg",
        "desktop-shell",
      )}
      style={
        hasBottomNav
          ? undefined
          : ({ ["--bottom-nav-h" as string]: "0px" } as React.CSSProperties)
      }
    >
      <header className="sticky top-0 z-40 border-b border-[color-mix(in_oklab,var(--color-gold)_22%,var(--color-border))] bg-bg/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
        <div className="desktop-shell-inner mx-auto flex h-12 items-center justify-between gap-2 px-3 sm:h-14 sm:px-6">
          <Link
            to="/"
            className="group flex min-h-11 items-center gap-2.5 no-underline"
          >
            <span className="lpin-mark" title="LPINv3">
              <img
                src="/lpin/mark-lpin-sq.png"
                alt=""
                width={38}
                height={38}
              />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight text-fg">
                LPINv3
              </span>
              <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-gold sm:inline">
                Light · Proof · Integrity · Navigation
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-1 sm:gap-2">
            <nav className="flex items-center gap-1" aria-label="Apps">
              <NavPill to="/claims" active={active === "claims"}>
                Claims
              </NavPill>
              <NavPill to="/jobsite" active={active === "jobsite"}>
                Jobsite
              </NavPill>
            </nav>

            {/* Desktop-only: open apps in separate windows for multi-monitor workflow */}
            <div
              className="ml-1 hidden items-center gap-0.5 border-l border-border pl-2 md:flex"
              aria-label="Open in new window"
            >
              <PopOutButton
                label="Claims window"
                title="Open Claims in a new window"
                onClick={() =>
                  openSuiteWindow("/claims", {
                    name: "lpin-claims",
                    width: 1100,
                    height: 900,
                  })
                }
              />
              <PopOutButton
                label="Jobsite window"
                title="Open Jobsite board in a new window (follows project sync)"
                onClick={() =>
                  openSuiteWindow("/jobsite", {
                    name: "lpin-jobsite-board",
                    width: 1400,
                    height: 920,
                  })
                }
              />
              <PopOutButton
                label="Map window"
                title="Open Jobsite Map in a new window (follows project sync)"
                onClick={() =>
                  openSuiteWindow("/jobsite?view=map", {
                    name: "lpin-jobsite-map",
                    width: 1400,
                    height: 920,
                  })
                }
              />
            </div>
          </div>
        </div>
      </header>

      <div className={cn("flex-1", hasBottomNav && "mobile-content md:pb-0")}>
        {children}
      </div>

      {/* Bottom nav: phone only — desktop uses header + in-app tabs */}
      {mobileNav ? <div className="md:hidden">{mobileNav}</div> : null}

      {!hideFooter && (
        <footer
          className={cn(
            "border-t border-[color-mix(in_oklab,var(--color-gold)_14%,var(--color-border))] py-4 sm:py-6",
            hasBottomNav && "hidden md:block",
          )}
        >
          <div className="desktop-shell-inner mx-auto space-y-2 px-4 sm:px-6">
            <div className="lpin-divider" />
            <p className="flex items-center justify-center gap-1.5 text-center text-xs leading-relaxed text-fg-subtle text-pretty">
              <HardHat className="size-3 text-gold" />
              LPINv3 · A person makes the final call · Not legal advice
            </p>
            <p className="hidden text-center text-[10px] text-fg-subtle md:block">
              Desktop: use the window buttons to open Claims, Jobsite, or Map side by side.
            </p>
            <PublicFooterLines />
          </div>
        </footer>
      )}
    </div>
  );
}

function NavPill({
  to,
  active,
  children,
}: {
  to: "/claims" | "/jobsite";
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex min-h-10 items-center rounded-full px-3.5 text-sm font-medium no-underline transition-colors",
        active
          ? "btn-sunrise text-accent-fg shadow-sm"
          : "text-fg-muted hover:bg-surface-1 hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}

function PopOutButton({
  label,
  title,
  onClick,
}: {
  label: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={label}
      onClick={onClick}
      className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border bg-surface-1 px-2 py-1.5 text-[11px] font-medium text-fg-muted transition-colors hover:border-gold/40 hover:bg-surface-2 hover:text-fg"
    >
      <PanelRightOpen className="size-3.5 text-gold" />
      <span className="hidden lg:inline">{label.replace(" window", "")}</span>
      <ExternalLink className="size-3 opacity-60" />
    </button>
  );
}
