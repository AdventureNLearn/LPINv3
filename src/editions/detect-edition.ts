/**
 * Jobsite edition detection (desktop fidelity freeze + mobile edition).
 * This workspace ships mobile as the default product surface.
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

export function readStoredEdition(): JobsiteEdition | null {
  if (typeof window === "undefined") return null;
  try {
    return parseEditionParam(window.localStorage.getItem(EDITION_STORAGE_KEY));
  } catch {
    return null;
  }
}

export function writeStoredEdition(edition: JobsiteEdition | null): void {
  if (typeof window === "undefined") return;
  try {
    if (edition == null) {
      window.localStorage.removeItem(EDITION_STORAGE_KEY);
    } else {
      window.localStorage.setItem(EDITION_STORAGE_KEY, edition);
    }
  } catch {
    /* ignore */
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
  preferViewport?: boolean;
  force?: JobsiteEdition;
  /** App-builder mobile workspace defaults to mobile. */
  defaultEdition?: JobsiteEdition;
};

export function detectEdition(
  opts: DetectEditionOptions = {},
): JobsiteEdition {
  if (opts.force) return opts.force;
  const fallback = opts.defaultEdition ?? "mobile";

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

  return fallback;
}
