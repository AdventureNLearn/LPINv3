/**
 * Refreshable jurisdiction guidance packs (device-local cache).
 * Opt-in network check against a static manifest — never a live code library.
 * Offline continues with last cache or shipped baselines.
 */

import type { StateCodeCycleMeta } from "./code-cycles";
import {
  hasDedicatedCycleProfile,
  resolveStateCodeCycle,
} from "./code-cycles";

export const JURISDICTION_PACK_FORMAT = "lpin-jurisdiction-pack" as const;
export const JURISDICTION_MANIFEST_FORMAT = "lpin-jurisdiction-manifest" as const;

export interface JurisdictionPack {
  format: typeof JURISDICTION_PACK_FORMAT;
  version: 1;
  stateCode: string;
  packVersion: string;
  updatedAt: string;
  cycle: StateCodeCycleMeta;
  /** Optional model-code labels for state baseline (guidance only). */
  modelCodes?: string[];
  notes?: string[];
}

export interface ManifestPackEntry {
  stateCode: string;
  packVersion: string;
  path: string;
}

export interface JurisdictionManifest {
  format: typeof JURISDICTION_MANIFEST_FORMAT;
  version: 1;
  generatedAt: string;
  packs: ManifestPackEntry[];
}

const CACHE_KEY = "lpin-jurisdiction-packs-v1";
const DEFAULT_MANIFEST_URL = "/packs/jurisdiction-manifest.json";

type PackCache = {
  fetchedAt: string;
  manifestGeneratedAt?: string;
  packs: Record<string, JurisdictionPack>;
};

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function readCache(): PackCache {
  if (!isBrowser()) return { fetchedAt: "", packs: {} };
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { fetchedAt: "", packs: {} };
    const data = JSON.parse(raw) as PackCache;
    if (!data || typeof data !== "object" || !data.packs) {
      return { fetchedAt: "", packs: {} };
    }
    return {
      fetchedAt: String(data.fetchedAt || ""),
      manifestGeneratedAt: data.manifestGeneratedAt
        ? String(data.manifestGeneratedAt)
        : undefined,
      packs: data.packs,
    };
  } catch {
    return { fetchedAt: "", packs: {} };
  }
}

function writeCache(cache: PackCache): void {
  if (!isBrowser()) return;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // Quota / private mode — ignore; offline baseline still works.
  }
}

export function getCachedJurisdictionPack(
  stateCode?: string,
): JurisdictionPack | null {
  const st = (stateCode || "").toUpperCase();
  if (!st) return null;
  const cache = readCache();
  return cache.packs[st] ?? null;
}

export function listCachedJurisdictionPacks(): JurisdictionPack[] {
  return Object.values(readCache().packs);
}

export function getGuidanceCacheMeta(): {
  fetchedAt: string;
  packCount: number;
  manifestGeneratedAt?: string;
} {
  const cache = readCache();
  return {
    fetchedAt: cache.fetchedAt,
    packCount: Object.keys(cache.packs).length,
    manifestGeneratedAt: cache.manifestGeneratedAt,
  };
}

function isValidPack(v: unknown): v is JurisdictionPack {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  if (p.format !== JURISDICTION_PACK_FORMAT) return false;
  if (p.version !== 1) return false;
  if (typeof p.stateCode !== "string" || !p.stateCode) return false;
  if (typeof p.packVersion !== "string" || !p.packVersion) return false;
  if (typeof p.updatedAt !== "string") return false;
  if (!p.cycle || typeof p.cycle !== "object") return false;
  return true;
}

function isValidManifest(v: unknown): v is JurisdictionManifest {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  if (m.format !== JURISDICTION_MANIFEST_FORMAT) return false;
  if (m.version !== 1) return false;
  if (!Array.isArray(m.packs)) return false;
  return true;
}

/** Semver-ish compare: returns true if a is newer than b. */
export function isPackVersionNewer(a: string, b: string): boolean {
  const pa = a.split(".").map((x) => parseInt(x, 10) || 0);
  const pb = b.split(".").map((x) => parseInt(x, 10) || 0);
  const n = Math.max(pa.length, pb.length);
  for (let i = 0; i < n; i++) {
    const da = pa[i] ?? 0;
    const db = pb[i] ?? 0;
    if (da > db) return true;
    if (da < db) return false;
  }
  return false;
}

export type GuidanceUpdateResult =
  | {
      ok: true;
      updated: string[];
      skipped: string[];
      message: string;
      fetchedAt: string;
    }
  | { ok: false; error: string };

/**
 * Opt-in: fetch static manifest + any newer packs, cache on device.
 * Safe offline: failures leave existing cache untouched.
 */
export async function checkGuidanceUpdates(options?: {
  manifestUrl?: string;
  /** When set, only refresh this state (still needs manifest). */
  stateCode?: string;
}): Promise<GuidanceUpdateResult> {
  if (!isBrowser()) {
    return { ok: false, error: "Guidance refresh is only available in the browser." };
  }

  const manifestUrl = options?.manifestUrl || DEFAULT_MANIFEST_URL;
  let manifest: JurisdictionManifest;
  try {
    const res = await fetch(manifestUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) {
      return {
        ok: false,
        error: `Could not reach guidance manifest (${res.status}). Working offline with last cache / shipped baselines.`,
      };
    }
    const json: unknown = await res.json();
    if (!isValidManifest(json)) {
      return { ok: false, error: "Guidance manifest format is not recognized." };
    }
    manifest = json;
  } catch {
    return {
      ok: false,
      error:
        "Network unavailable. Using last cached guidance or shipped baselines.",
    };
  }

  const cache = readCache();
  const want = (options?.stateCode || "").toUpperCase();
  const entries = manifest.packs.filter((e) =>
    want ? e.stateCode.toUpperCase() === want : true,
  );

  const updated: string[] = [];
  const skipped: string[] = [];

  for (const entry of entries) {
    const st = entry.stateCode.toUpperCase();
    const existing = cache.packs[st];
    if (
      existing &&
      !isPackVersionNewer(entry.packVersion, existing.packVersion)
    ) {
      skipped.push(st);
      continue;
    }

    try {
      const packUrl = entry.path.startsWith("http")
        ? entry.path
        : entry.path.startsWith("/")
          ? entry.path
          : `/${entry.path}`;
      const res = await fetch(packUrl, {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        skipped.push(st);
        continue;
      }
      const json: unknown = await res.json();
      if (!isValidPack(json)) {
        skipped.push(st);
        continue;
      }
      if (json.stateCode.toUpperCase() !== st) {
        skipped.push(st);
        continue;
      }
      cache.packs[st] = {
        ...json,
        stateCode: st,
        cycle: {
          ...json.cycle,
          stateCode: st,
          packVersion: json.packVersion,
        },
      };
      updated.push(st);
    } catch {
      skipped.push(st);
    }
  }

  const fetchedAt = new Date().toISOString();
  cache.fetchedAt = fetchedAt;
  cache.manifestGeneratedAt = manifest.generatedAt;
  writeCache(cache);

  if (updated.length === 0) {
    return {
      ok: true,
      updated,
      skipped,
      fetchedAt,
      message:
        skipped.length > 0
          ? "Guidance packs are already current on this device."
          : "No guidance packs listed in the manifest yet.",
    };
  }

  return {
    ok: true,
    updated,
    skipped,
    fetchedAt,
    message: `Updated guidance for ${updated.join(", ")}. Data stays on this device.`,
  };
}

/**
 * Prefer a cached cycle profile when packVersion is same or newer than shipped.
 * Returns null when no cache entry.
 */
export function resolveCachedCycle(
  stateCode?: string,
  shippedPackVersion?: string,
): StateCodeCycleMeta | null {
  const cached = getCachedJurisdictionPack(stateCode);
  if (!cached) return null;
  if (
    shippedPackVersion &&
    isPackVersionNewer(shippedPackVersion, cached.packVersion)
  ) {
    // Shipped app data is newer than cache — prefer shipped.
    return null;
  }
  return cached.cycle;
}

export const GUIDANCE_REFRESH_DISCLAIMER =
  "Guidance packs are field reference only — not legal advice and not a live AHJ portal. Confirm the adopted edition with the local building department.";

/**
 * Cycle resolution with device cache overlay (preferred for UI).
 * Shipped baselines remain the offline default when cache is empty.
 */
export function resolveStateCodeCycleWithCache(
  stateCode?: string,
): ReturnType<typeof resolveStateCodeCycle> {
  const shipped = resolveStateCodeCycle(stateCode);
  const cached = resolveCachedCycle(stateCode, shipped?.packVersion);
  return cached ?? shipped;
}

export function hasDedicatedCycleProfileWithCache(stateCode?: string): boolean {
  if (getCachedJurisdictionPack(stateCode)) return true;
  return hasDedicatedCycleProfile(stateCode);
}

