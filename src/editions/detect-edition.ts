/**
 * Jobsite edition detection (desktop fidelity freeze + mobile edition).
 *
 * Order:
 * 1. `?edition=mobile|desktop` URL override
 * 2. `localStorage` key `lpin-edition`
 * 3. Viewport ≤767px → mobile (when `preferViewport` is true)
 * 4. Default: desktop
 *
 * Lab densify (`VITE_LPIN_LAB_SCALE`) is independent of edition (D1).
 *
 * Phase DF: callers may force desktop until M0 wires MobileJobsiteShell.
 */

export type JobsiteEdition = "desktop" | "mobile";

export const EDITION_STORAGE_KEY = "lpin-edition";

const MOBILE_MAX_WIDTH_PX = 767;

export function parseEditionParam(
  value: string | null | undefined,
): JobsiteEdition | null {
  if (value === "mobile" || value === "desktop") return value;
  return null;
}

/** Read preference from localStorage (null if unset / unavailable). */
export function readStoredEdition(): JobsiteEdition | null {
  if (typeof window === "undefined") return null;
  try {
    return parseEditionParam(window.localStorage.getItem(EDITION_STORAGE_KEY));
  } catch {
    return null;
  }
}

/** Persist user preference. Pass null to clear. */
export function writeStoredEdition(edition: JobsiteEdition | null): void {
  if (typeof window === "undefined") return;
  try {
    if (edition == null) {
      window.localStorage.removeItem(EDITION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(EDITION_STORAGE_KEY, edition);
    }
  } catch {
    /* ignore quota / private mode */
  }
}

export function isMobileViewport(
  maxWidthPx: number = MOBILE_MAX_WIDTH_PX,
): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches;
  } catch {
    return false;
  }
}

export type DetectEditionOptions = {
  /**
   * When true (M0+), use viewport heuristic if no URL/storage override.
   * Phase DF keeps this false so extraction is behavior-identical desktop.
   */
  preferViewport?: boolean;
  /** Force a result (tests / forced desktop freeze path). */
  force?: JobsiteEdition;
};

/**
 * Resolve which Jobsite chrome to mount.
 * Does not change domain data or lab densify flags.
 */
export function detectEdition(
  opts: DetectEditionOptions = {},
): JobsiteEdition {
  if (opts.force) return opts.force;

  if (typeof window !== "undefined") {
    try {
      const fromUrl = parseEditionParam(
        new URLSearchParams(window.location.search).get("edition"),
      );
      if (fromUrl) return fromUrl;
    } catch {
      /* ignore */
    }

    const stored = readStoredEdition();
    if (stored) return stored;

    if (opts.preferViewport && isMobileViewport()) {
      return "mobile";
    }
  }

  return "desktop";
}
