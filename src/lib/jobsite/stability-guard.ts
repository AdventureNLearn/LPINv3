/**
 * Jobsite stability guard — thrash detection + running session log.
 *
 * When multi-window sync or save loops fire too fast, we:
 *  1. Record events in a session ring (and console)
 *  2. Open a circuit that blocks remote project apply for a cooldown
 *  3. Surface a short reason for the workspace bar
 *
 * Persistent human log: docs/STABILITY-LOG.md (append incidents there).
 */

const RING_KEY = "lpin-stability-ring";
const CIRCUIT_KEY = "lpin-stability-circuit-until";
const MAX_RING = 80;

/** ≥ this many project imports within WINDOW_MS → thrash */
const THRASH_COUNT = 4;
const THRASH_WINDOW_MS = 1200;
/** How long to ignore remote project switches after thrash */
const COOLDOWN_MS = 8000;

export type StabilityKind =
  | "boot"
  | "import"
  | "switch"
  | "remote-apply"
  | "remote-blocked"
  | "save"
  | "broadcast"
  | "thrash"
  | "circuit-open"
  | "circuit-close"
  | "note";

export interface StabilityEvent {
  at: string;
  t: number;
  kind: StabilityKind;
  detail?: string;
  projectId?: string;
}

type Listener = (e: StabilityEvent) => void;
const listeners = new Set<Listener>();

let importTimes: number[] = [];
let lastCircuitOpen = 0;

function now() {
  return Date.now();
}

function iso(t = now()) {
  return new Date(t).toISOString();
}

function readRing(): StabilityEvent[] {
  if (typeof sessionStorage === "undefined") return [];
  try {
    const raw = sessionStorage.getItem(RING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as StabilityEvent[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRing(events: StabilityEvent[]) {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(RING_KEY, JSON.stringify(events.slice(-MAX_RING)));
  } catch {
    /* private / quota */
  }
}

export function logStability(
  kind: StabilityKind,
  detail?: string,
  projectId?: string,
): StabilityEvent {
  const e: StabilityEvent = {
    at: iso(),
    t: now(),
    kind,
    detail,
    projectId,
  };
  const ring = readRing();
  ring.push(e);
  writeRing(ring);

  if (kind === "thrash" || kind === "circuit-open") {
    console.warn("[LPIN-STABILITY]", kind, detail ?? "", projectId ?? "");
  } else if (typeof localStorage !== "undefined" && localStorage.getItem("lpin-stability-debug") === "1") {
    console.info("[LPIN-STABILITY]", kind, detail ?? "", projectId ?? "");
  }

  for (const fn of listeners) {
    try {
      fn(e);
    } catch {
      /* ignore */
    }
  }
  return e;
}

export function getStabilityLog(): StabilityEvent[] {
  return readRing();
}

export function clearStabilityLog(): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(RING_KEY);
  } catch {
    /* ignore */
  }
}

export function subscribeStability(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export function isStabilityCircuitOpen(): boolean {
  if (typeof sessionStorage === "undefined") return false;
  try {
    const until = Number(sessionStorage.getItem(CIRCUIT_KEY) || 0);
    if (!until) return false;
    if (now() >= until) {
      sessionStorage.removeItem(CIRCUIT_KEY);
      if (lastCircuitOpen) {
        lastCircuitOpen = 0;
        logStability("circuit-close", "cooldown elapsed");
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function stabilityCircuitRemainingMs(): number {
  if (typeof sessionStorage === "undefined") return 0;
  try {
    const until = Number(sessionStorage.getItem(CIRCUIT_KEY) || 0);
    return Math.max(0, until - now());
  } catch {
    return 0;
  }
}

function openCircuit(reason: string) {
  const until = now() + COOLDOWN_MS;
  lastCircuitOpen = until;
  try {
    sessionStorage.setItem(CIRCUIT_KEY, String(until));
  } catch {
    /* ignore */
  }
  logStability("thrash", reason);
  logStability("circuit-open", `blocking remote apply for ${COOLDOWN_MS}ms`);
}

/**
 * Call on every project board import / remote apply.
 * Returns false if the apply should be aborted (circuit open or thrash just detected).
 */
export function noteProjectImport(
  projectId: string,
  source: "boot" | "user" | "remote" | "unlock",
): boolean {
  const t = now();

  if (source === "remote" && isStabilityCircuitOpen()) {
    logStability(
      "remote-blocked",
      `circuit open (${stabilityCircuitRemainingMs()}ms left)`,
      projectId,
    );
    return false;
  }

  // User / boot always allowed; still count for thrash detection
  importTimes.push(t);
  importTimes = importTimes.filter((x) => t - x <= THRASH_WINDOW_MS);

  if (importTimes.length >= THRASH_COUNT) {
    openCircuit(
      `${importTimes.length} project loads in ${THRASH_WINDOW_MS}ms (source=${source})`,
    );
    importTimes = [];
    // Allow the user-initiated load that tipped us, block remotes after
    if (source === "remote") {
      logStability("remote-blocked", "thrash trip", projectId);
      return false;
    }
  }

  logStability(
    source === "remote" ? "remote-apply" : source === "user" ? "switch" : "import",
    source,
    projectId,
  );
  return true;
}

/** Export ring as text for pasting into STABILITY-LOG.md */
export function formatStabilityLogForPaste(): string {
  const ring = readRing();
  if (!ring.length) return "(empty stability ring)";
  return ring
    .map(
      (e) =>
        `- ${e.at}  **${e.kind}**  ${e.projectId ?? ""}  ${e.detail ?? ""}`.trimEnd(),
    )
    .join("\n");
}
