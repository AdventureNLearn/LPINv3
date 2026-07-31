/**
 * Lab vs product release mode.
 *
 * D1: Full 15-min portfolio densify must never be the public product default.
 * D2: AdventureNLearn may release under any brand/repo anytime — these flags
 *     still protect what a "product" build contains.
 *
 * Set VITE_LPIN_LAB_SCALE=1 only for private research deploys / local lab work.
 */

/** True only when lab scale is explicitly enabled at build/dev time. */
export function isLabScaleEnabled(): boolean {
  try {
    // Vite injects import.meta.env at build time
    return import.meta.env?.VITE_LPIN_LAB_SCALE === "1";
  } catch {
    return false;
  }
}

/** Human label for UI / diagnostics */
export function releaseModeLabel(): "lab-scale" | "product" {
  return isLabScaleEnabled() ? "lab-scale" : "product";
}

/**
 * Whether seed may attach IX-15M interval field logs.
 * Product default: false → narrative/light fieldComms only.
 */
export function allowIntervalFieldLogSeed(): boolean {
  return isLabScaleEnabled();
}
