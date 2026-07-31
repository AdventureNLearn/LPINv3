import { Link } from "@tanstack/react-router";
import { PublicFooterLines } from "@/components/integrity/HarborRules";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  active,
  mobileNav,
  hideFooter,
  edition = "mobile",
}: {
  children: React.ReactNode;
  active?: "home" | "claims" | "jobsite";
  mobileNav?: React.ReactNode;
  hideFooter?: boolean;
  edition?: "mobile" | "desktop";
}) {
  const hasBottomNav = Boolean(mobileNav);

  return (
    <div
      data-edition={edition}
      className={cn(
        "flex h-dvh max-h-dvh flex-col overflow-hidden bg-bg text-fg",
      )}
      style={
        hasBottomNav
          ? ({
              ["--bottom-nav-h" as string]: "4.75rem",
            } as React.CSSProperties)
          : ({ ["--bottom-nav-h" as string]: "0px" } as React.CSSProperties)
      }
    >
      <header className="sticky top-0 z-40 shrink-0 border-b border-[color-mix(in_oklab,var(--color-gold)_22%,var(--color-border))] bg-bg/95 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
        <div className="mx-auto flex h-12 w-full max-w-lg items-center justify-between gap-2 px-3 sm:h-14 sm:max-w-2xl sm:px-4">
          <Link
            to="/"
            className="group flex min-h-11 min-w-0 items-center gap-2 no-underline"
          >
            <span className="lpin-mark shrink-0" title="LPINv3">
              <img
                src="/lpin/mark-lpin-sq.png"
                alt=""
                width={38}
                height={38}
              />
            </span>
            <span className="flex min-w-0 flex-col leading-none">
              <span className="truncate text-sm font-semibold tracking-tight text-fg">
                LPINv3
              </span>
              <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-gold">
                Mobile field
              </span>
            </span>
          </Link>

          <nav className="flex shrink-0 items-center gap-1" aria-label="Suite apps">
            <NavPill to="/jobsite" active={active === "jobsite"}>
              Jobsite
            </NavPill>
            <NavPill to="/claims" active={active === "claims"}>
              Claims
            </NavPill>
          </nav>
        </div>
      </header>

      {/* Scroll region — leaves room for fixed bottom nav */}
      <div
        id="lpin-scroll-root"
        className={cn(
          "min-h-0 flex-1 overflow-y-auto overscroll-y-contain",
          hasBottomNav && "pb-[calc(var(--bottom-nav-h)+env(safe-area-inset-bottom,0px)+1.25rem)]",
        )}
      >
        {children}
      </div>

      {mobileNav}

      {!hideFooter && !hasBottomNav ? (
        <footer className="shrink-0 border-t border-border px-4 py-6">
          <PublicFooterLines />
        </footer>
      ) : null}
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
        "inline-flex min-h-10 items-center rounded-full px-3.5 text-xs font-semibold no-underline transition-colors",
        active
          ? "bg-[image:var(--gradient-sunrise)] text-accent-fg shadow-sm"
          : "border border-border-strong bg-surface-2 text-fg-muted hover:text-gold",
      )}
    >
      {children}
    </Link>
  );
}
