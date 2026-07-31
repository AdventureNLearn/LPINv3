/**
 * Cross-window project sync + per-window lock.
 *
 * - Unlocked windows follow the shared active project (localStorage + BroadcastChannel).
 * - Locked windows keep their own project until unlocked.
 * - Session-only lock so each monitor pane can pin a different project.
 */

import type { ProjectSyncMessage } from "./project-types";

export const ACTIVE_PROJECT_KEY = "lpin-jobsite-active-id";
export const WINDOW_LOCK_KEY = "lpin-window-project-lock";
export const WINDOW_PROJECT_KEY = "lpin-window-project-id";
export const WINDOW_ID_KEY = "lpin-window-id";
const CHANNEL = "lpin-jobsite-project";

export function getWindowId(): string {
  if (typeof window === "undefined") return "ssr";
  try {
    let id = sessionStorage.getItem(WINDOW_ID_KEY);
    if (!id) {
      id = `w_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
      sessionStorage.setItem(WINDOW_ID_KEY, id);
    }
    return id;
  } catch {
    return `w_${Math.random().toString(36).slice(2, 9)}`;
  }
}

export function isWindowLocked(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(WINDOW_LOCK_KEY) === "1";
  } catch {
    return false;
  }
}

export function setWindowLocked(locked: boolean, projectId?: string): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(WINDOW_LOCK_KEY, locked ? "1" : "0");
    if (locked && projectId) {
      sessionStorage.setItem(WINDOW_PROJECT_KEY, projectId);
    }
    if (!locked) {
      sessionStorage.removeItem(WINDOW_PROJECT_KEY);
    }
  } catch {
    /* private mode */
  }
}

export function getLockedProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    if (!isWindowLocked()) return null;
    return sessionStorage.getItem(WINDOW_PROJECT_KEY);
  } catch {
    return null;
  }
}

export function readSharedActiveProjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(ACTIVE_PROJECT_KEY);
  } catch {
    return null;
  }
}

type Listener = (msg: ProjectSyncMessage) => void;

let channel: BroadcastChannel | null = null;
const listeners = new Set<Listener>();

function ensureChannel(): BroadcastChannel | null {
  if (typeof window === "undefined") return null;
  if (typeof BroadcastChannel === "undefined") return null;
  if (!channel) {
    channel = new BroadcastChannel(CHANNEL);
    channel.onmessage = (ev) => {
      const msg = ev.data as ProjectSyncMessage;
      if (!msg || typeof msg !== "object" || !("type" in msg)) return;
      for (const fn of listeners) {
        try {
          fn(msg);
        } catch {
          /* ignore listener errors */
        }
      }
    };
  }
  return channel;
}

export function subscribeProjectSync(fn: Listener): () => void {
  listeners.add(fn);
  ensureChannel();

  // storage event for cross-tab when BroadcastChannel unavailable / multi-profile
  const onStorage = (e: StorageEvent) => {
    if (e.key === ACTIVE_PROJECT_KEY && e.newValue) {
      fn({
        type: "active-changed",
        projectId: e.newValue,
        sourceWindowId: "storage",
        at: new Date().toISOString(),
      });
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }

  return () => {
    listeners.delete(fn);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

export function broadcastProjectSync(
  msg:
    | { type: "active-changed"; projectId: string; sourceWindowId?: string }
    | { type: "project-patched"; projectId: string; sourceWindowId?: string }
    | { type: "lists-changed"; sourceWindowId?: string }
    | { type: "portfolio-reseeded"; sourceWindowId?: string },
): void {
  const full = {
    ...msg,
    sourceWindowId: msg.sourceWindowId ?? getWindowId(),
    at: new Date().toISOString(),
  } as ProjectSyncMessage;
  const ch = ensureChannel();
  try {
    // BroadcastChannel does not deliver to the same browsing context.
    // Do NOT also fan out to local listeners — that caused same-window bounce loops.
    ch?.postMessage(full);
  } catch {
    /* ignore */
  }
}

/** Write shared active id only when the value actually changes. */
export function writeSharedActiveProjectId(projectId: string): void {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(ACTIVE_PROJECT_KEY) === projectId) return;
    localStorage.setItem(ACTIVE_PROJECT_KEY, projectId);
  } catch {
    /* ignore */
  }
}

export function openJobsiteWindow(
  opts: {
    projectId?: string;
    view?: string;
    locked?: boolean;
    name?: string;
    width?: number;
    height?: number;
  } = {},
): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams();
  if (opts.view) params.set("view", opts.view);
  if (opts.projectId) params.set("project", opts.projectId);
  if (opts.locked) params.set("lock", "1");
  const q = params.toString();
  const path = q ? `/jobsite?${q}` : "/jobsite";
  const url = new URL(path, window.location.origin).toString();
  const w = opts.width ?? 1280;
  const h = opts.height ?? 900;
  const left = Math.max(0, Math.round((window.screen.width - w) / 2));
  const top = Math.max(0, Math.round((window.screen.height - h) / 2));
  const name =
    opts.name ??
    `lpin-js-${opts.view ?? "board"}-${(opts.projectId ?? "sync").slice(-12)}`;
  window.open(
    url,
    name,
    `noopener,noreferrer,width=${w},height=${h},left=${left},top=${top}`,
  );
}
