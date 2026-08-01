/**
 * Content-only trade packs for LPINv3 Jobsite.
 * Sibling pattern to jurisdiction-packs.ts — load / validate / list / optional material seed.
 * Does NOT add permanent Jobsite nav chrome. Guidance only; human owns every status.
 */

import { newId } from "./domain";
import { TRADE_DIVISIONS } from "./divisions";
import type { Jobsite, MaterialLine, TradeDivision } from "./types";

export const TRADE_PACK_FORMAT = "lpin-trade-pack" as const;
export const TRADE_MANIFEST_FORMAT = "lpin-trade-manifest" as const;

export type Priority = "P0" | "P1" | "P2" | "P3";

export interface TradePackChecklistItem {
  id: string;
  text: string;
}

export interface TradePackChecklist {
  id: string;
  label: string;
  match: string[];
  items: TradePackChecklistItem[];
}

export interface TradePackHoldPoint {
  id: string;
  label: string;
  blocksConcealment: boolean;
  inspectionMatch?: string[];
  clearedBy?: "inspector" | "super" | "trade_lead" | "either";
  notes?: string;
}

export interface TradePackMaterialSeed {
  name: string;
  unit: string;
  qtyRequired: number;
  unitCost: number;
  specNote?: string;
  scheduleTitleIncludes?: string;
}

export interface TradePackSequence {
  dependsOnDivisions: TradeDivision[];
  blocksDivisions: TradeDivision[];
  typicalPhase?: string;
  notes?: string;
}

export interface TradePackSafetyPhrase {
  id: string;
  priority: Priority;
  phrase: string;
  category?: string;
}

export interface TradePackPhotoSet {
  id: string;
  label: string;
  requiredForHoldId?: string;
  examples?: string[];
}

export interface TradePackInterviewSlot {
  slotId: string;
  prompt: string;
  mapsTo?: string;
}

export interface TradePack {
  format: typeof TRADE_PACK_FORMAT;
  version: 1;
  packVersion: string;
  updatedAt: string;
  division: TradeDivision;
  label: string;
  short?: string;
  csiPrimary?: string[];
  csiRelated?: string[];
  disclaimer: string;
  checklists: TradePackChecklist[];
  holdPoints: TradePackHoldPoint[];
  materials: TradePackMaterialSeed[];
  sequence: TradePackSequence;
  safetyPhrases: TradePackSafetyPhrase[];
  photoSets: TradePackPhotoSet[];
  readinessCriteria: string[];
  interviewSlots?: TradePackInterviewSlot[];
}

export interface TradeManifestEntry {
  division: TradeDivision;
  packVersion: string;
  label: string;
  path: string;
}

export interface TradeManifest {
  format: typeof TRADE_MANIFEST_FORMAT;
  version: 1;
  generatedAt: string;
  packs: TradeManifestEntry[];
}

const DEFAULT_MANIFEST_URL = "/packs/trade-manifest.json";
const CACHE_KEY = "lpin-trade-packs-v1";

type PackCache = {
  fetchedAt: string;
  manifestGeneratedAt?: string;
  packs: Partial<Record<TradeDivision, TradePack>>;
};

const DIVISION_SET = new Set<string>(TRADE_DIVISIONS.map((d) => d.id));

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
    // Quota / private mode — ignore
  }
}

export function isValidTradePack(v: unknown): v is TradePack {
  if (!v || typeof v !== "object") return false;
  const p = v as Record<string, unknown>;
  if (p.format !== TRADE_PACK_FORMAT) return false;
  if (p.version !== 1) return false;
  if (typeof p.packVersion !== "string" || !p.packVersion) return false;
  if (typeof p.updatedAt !== "string") return false;
  if (typeof p.division !== "string" || !DIVISION_SET.has(p.division)) return false;
  if (typeof p.label !== "string" || !p.label) return false;
  if (typeof p.disclaimer !== "string" || p.disclaimer.length < 20) return false;
  if (!Array.isArray(p.checklists)) return false;
  if (!Array.isArray(p.holdPoints)) return false;
  if (!Array.isArray(p.materials)) return false;
  if (!p.sequence || typeof p.sequence !== "object") return false;
  if (!Array.isArray(p.safetyPhrases)) return false;
  if (!Array.isArray(p.photoSets)) return false;
  if (!Array.isArray(p.readinessCriteria)) return false;
  return true;
}

export function isValidTradeManifest(v: unknown): v is TradeManifest {
  if (!v || typeof v !== "object") return false;
  const m = v as Record<string, unknown>;
  if (m.format !== TRADE_MANIFEST_FORMAT) return false;
  if (m.version !== 1) return false;
  if (!Array.isArray(m.packs)) return false;
  return true;
}

/** Semver-ish: true if a is newer than b. */
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

export function getCachedTradePack(division: TradeDivision): TradePack | null {
  return readCache().packs[division] ?? null;
}

export function listCachedTradePacks(): TradePack[] {
  return Object.values(readCache().packs).filter(Boolean) as TradePack[];
}

export async function fetchTradeManifest(
  manifestUrl = DEFAULT_MANIFEST_URL,
): Promise<TradeManifest | null> {
  try {
    const res = await fetch(manifestUrl, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    return isValidTradeManifest(json) ? json : null;
  } catch {
    return null;
  }
}

export async function fetchTradePack(
  division: TradeDivision,
  path?: string,
): Promise<TradePack | null> {
  const url =
    path ||
    `/packs/trades/${division}.v0.1.0.json`;
  try {
    const res = await fetch(url, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    const json: unknown = await res.json();
    if (!isValidTradePack(json)) return null;
    if (json.division !== division) return null;
    return json;
  } catch {
    return null;
  }
}

export type TradePackRefreshResult =
  | {
      ok: true;
      updated: TradeDivision[];
      skipped: TradeDivision[];
      message: string;
      fetchedAt: string;
    }
  | { ok: false; error: string };

/**
 * Opt-in: fetch trade manifest + newer packs into device cache.
 * Offline-safe; failures leave existing cache untouched.
 */
export async function refreshTradePacks(options?: {
  manifestUrl?: string;
  division?: TradeDivision;
}): Promise<TradePackRefreshResult> {
  if (!isBrowser()) {
    return { ok: false, error: "Trade pack refresh is only available in the browser." };
  }

  const manifest = await fetchTradeManifest(options?.manifestUrl);
  if (!manifest) {
    return {
      ok: false,
      error:
        "Could not load trade pack manifest. Working offline with last cache if any.",
    };
  }

  const cache = readCache();
  const want = options?.division;
  const entries = manifest.packs.filter((e) =>
    want ? e.division === want : true,
  );

  const updated: TradeDivision[] = [];
  const skipped: TradeDivision[] = [];

  for (const entry of entries) {
    const div = entry.division;
    if (!DIVISION_SET.has(div)) {
      skipped.push(div);
      continue;
    }
    const existing = cache.packs[div];
    if (
      existing &&
      !isPackVersionNewer(entry.packVersion, existing.packVersion)
    ) {
      skipped.push(div);
      continue;
    }

    const pack = await fetchTradePack(div, entry.path);
    if (!pack) {
      skipped.push(div);
      continue;
    }
    cache.packs[div] = pack;
    updated.push(div);
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
          ? "Trade packs are already current on this device."
          : "No trade packs listed in the manifest yet.",
    };
  }

  return {
    ok: true,
    updated,
    skipped,
    fetchedAt,
    message: `Updated trade packs for ${updated.join(", ")}. Data stays on this device.`,
  };
}

/**
 * Seed material lines from a trade pack onto a jobsite.
 * Does not replace existing lines; appends. Does not auto-create FieldReports
 * or claim inspection authority. Sequence edges are advisory only — not applied as CPM.
 */
export function applyTradePackMaterialSeed(
  jobsite: Jobsite,
  pack: TradePack,
): Jobsite {
  if (!isValidTradePack(pack)) return jobsite;
  const now = new Date().toISOString();
  const schedule = jobsite.schedule ?? [];
  const seeded: MaterialLine[] = pack.materials.map((m) => {
    let scheduleTaskId: string | undefined;
    if (m.scheduleTitleIncludes) {
      const hit = schedule.find((t) =>
        t.title.toLowerCase().includes(m.scheduleTitleIncludes!.toLowerCase()),
      );
      scheduleTaskId = hit?.id;
    }
    return {
      id: newId("mat"),
      name: m.name,
      division: pack.division,
      unit: m.unit,
      qtyRequired: m.qtyRequired,
      qtyOnHand: 0,
      unitCost: m.unitCost,
      status: "needed" as const,
      scheduleTaskId,
      specNote: m.specNote,
      createdAt: now,
      updatedAt: now,
    };
  });

  return {
    ...jobsite,
    updatedAt: now,
    materials: [...(jobsite.materials ?? []), ...seeded],
  };
}

/**
 * Resolve checklists from a pack that match a free-text query
 * (same match[] convention as ChecklistTemplate).
 */
export function matchTradePackChecklists(
  pack: TradePack,
  query: string,
): TradePackChecklist[] {
  const q = query.toLowerCase().trim();
  if (!q) return pack.checklists;
  return pack.checklists.filter((c) => {
    if (c.label.toLowerCase().includes(q)) return true;
    return c.match.some((m) => m.toLowerCase().includes(q) || q.includes(m.toLowerCase()));
  });
}

export function listHoldPointsBlockingConcealment(
  pack: TradePack,
): TradePackHoldPoint[] {
  return pack.holdPoints.filter((h) => h.blocksConcealment);
}

export function safetyPhrasesByPriority(
  pack: TradePack,
  priority?: Priority,
): TradePackSafetyPhrase[] {
  if (!priority) return pack.safetyPhrases;
  return pack.safetyPhrases.filter((s) => s.priority === priority);
}

export const TRADE_PACK_DISCLAIMER =
  "Trade packs are field guidance only — not AHJ forms, not a live code library, not legal advice. A person owns every status, hold clear, and inspection call. Confirm adopted edition and inspection sequence with the local building department.";
