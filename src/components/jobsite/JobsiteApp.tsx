/**
 * Jobsite app entry — edition router.
 *
 * Desktop fidelity freeze: `DesktopJobsiteShell` (`desktop/fidelity-v1`).
 * Mobile shell mounts in M0+ when detectEdition returns "mobile".
 *
 * Domain store stays shared; only chrome differs by edition.
 * @see docs/DESKTOP-FIDELITY.md
 * @see src/editions/detect-edition.ts
 */
import { useSyncExternalStore } from "react";
import { DesktopJobsiteShell } from "@/editions/desktop/DesktopJobsiteShell";
import {
  detectEdition,
  type JobsiteEdition,
} from "@/editions/detect-edition";

/**
 * Phase DF: viewport auto-switch is off so behavior matches the pre-split app.
 * M0 enables preferViewport when MobileJobsiteShell exists.
 */
const PREFER_VIEWPORT = false;

function subscribeEdition(onStoreChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onChange = () => onStoreChange();
  window.addEventListener("storage", onChange);
  window.addEventListener("popstate", onChange);
  // Same-tab preference writes can dispatch this custom event (M0+ settings).
  window.addEventListener("lpin-edition-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("popstate", onChange);
    window.removeEventListener("lpin-edition-change", onChange);
  };
}

function getEditionSnapshot(): JobsiteEdition {
  return detectEdition({ preferViewport: PREFER_VIEWPORT });
}

function getServerSnapshot(): JobsiteEdition {
  return "desktop";
}

export function JobsiteApp() {
  const edition = useSyncExternalStore(
    subscribeEdition,
    getEditionSnapshot,
    getServerSnapshot,
  );

  // M0: mount MobileJobsiteShell when edition === "mobile".
  // Until M0, always desktop chrome (fidelity freeze) even if URL asks for mobile.
  void edition;
  return <DesktopJobsiteShell />;
}
