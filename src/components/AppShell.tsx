import { Link } from "@tanstack/react-router";
import { HardHat } from "lucide-react";
import { PublicFooterLines } from "@/components/integrity/HarborRules";
import { cn } from "@/lib/utils";

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
      className="flex min-h-dvh flex-col bg-bg text-fg"
      style={
        hasBottomNav
          ? undefined
          : ({ ["--bottom-nav-h" as string]: "0px" } as React.CSSProperties)
      }
    >
      <header className="sticky top-0 z-40 border-b border-[color-mix(in_oklab,var(--color-gold)_22%,var(--color-border))] bg-bg/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between gap-2 px-3 sm:h-14 sm:px-6">
          <Link
            to="/"
            className="group flex min-h-11 items-center gap-2.5 no-underline"
          >
            <span className="lpin-mark" title="LPIN Suite">
              <img
                src="/lpin/mark-lpin-sq.png"
                alt=""
                width={38}
                height={38}
              />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-sm font-semibold tracking-tight text-fg">
                LPIN Suite
              </span>
              <span className="hidden text-[10px] font-medium uppercase tracking-[0.14em] text-gold sm:inline">
                Light · Proof · Integrity · Navigation
              </span>
            </span>
          </Link>

          <nav className="flex items-center gap-1" aria-label="Apps">
            <NavPill to="/claims" active={active === "claims"}>
              Claims
            </NavPill>
            <NavPill to="/jobsite" active={active === "jobsite"}>
              Jobsite
            </NavPill>
          </nav>
        </div>
      </header>

      <div className={cn("flex-1", hasBottomNav && "mobile-content md:pb-0")}>
        {children}
      </div>

      {mobileNav ? <div className="md:hidden">{mobileNav}</div> : null}

      {!hideFooter && (
        <footer
          className={cn(
            "border-t border-[color-mix(in_oklab,var(--color-gold)_14%,var(--color-border))] py-4 sm:py-6",
            hasBottomNav && "hidden md:block",
          )}
        >
          <div className="mx-auto max-w-6xl space-y-2 px-4 sm:px-6">
            <div className="lpin-divider" />
            <p className="flex items-center justify-center gap-1.5 text-center text-xs leading-relaxed text-fg-subtle text-pretty">
              <HardHat className="size-3 text-gold" />
              LPIN Suite · A person makes the final call · Not legal advice
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
