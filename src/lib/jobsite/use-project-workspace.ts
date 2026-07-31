/**
 * Wires portfolio + sync/lock into the single-board Jobsite store.
 * Deliberately conservative: no save/sync feedback loops, debounced portfolio writes.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePortfolioStore } from "./portfolio-store";
import {
  broadcastProjectSync,
  getLockedProjectId,
  getWindowId,
  isWindowLocked,
  openJobsiteWindow,
  readSharedActiveProjectId,
  setWindowLocked,
  subscribeProjectSync,
  writeSharedActiveProjectId,
} from "./project-sync";
import {
  isStabilityCircuitOpen,
  logStability,
  noteProjectImport,
  stabilityCircuitRemainingMs,
  subscribeStability,
} from "./stability-guard";
import { useJobsiteStore } from "./store";
import type { Jobsite } from "./types";
import { catalogStats } from "./project-catalog";

const SAVE_DEBOUNCE_MS = 900;

export function useProjectWorkspace() {
  const jobsite = useJobsiteStore((s) => s.jobsite);
  const importJobsite = useJobsiteStore((s) => s.importJobsite);
  const setView = useJobsiteStore((s) => s.setView);

  const ready = usePortfolioStore((s) => s.ready);
  const activeProjectId = usePortfolioStore((s) => s.activeProjectId);
  const lists = usePortfolioStore((s) => s.lists);
  // Subscribe to meta object (stable identity until portfolio changes), not a new array each render
  const meta = usePortfolioStore((s) => s.meta);

  const [locked, setLocked] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [circuitOpen, setCircuitOpen] = useState(false);
  const applyingRemote = useRef(false);
  const lastSavedKey = useRef<string>("");
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootstrapped = useRef(false);
  const windowId = useRef(getWindowId());

  const metaList = useMemo(
    () => Object.values(meta).sort((a, b) => a.name.localeCompare(b.name)),
    [meta],
  );

  const stats = useMemo(() => catalogStats(metaList), [metaList]);

  // Circuit UI tick
  useEffect(() => {
    setCircuitOpen(isStabilityCircuitOpen());
    return subscribeStability((e) => {
      if (e.kind === "circuit-open" || e.kind === "thrash") {
        setCircuitOpen(true);
      }
      if (e.kind === "circuit-close") {
        setCircuitOpen(false);
      }
    });
  }, []);

  // Bootstrap seed + deep-link project — once per window
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    if (typeof window === "undefined") return;

    logStability("boot", "jobsite workspace mount", windowId.current);

    const port = usePortfolioStore.getState();
    port.ensureSeeded();

    const params = new URLSearchParams(window.location.search);
    const urlProject = params.get("project");
    const urlLock = params.get("lock") === "1";
    const urlView = params.get("view");

    const existing = useJobsiteStore.getState().jobsite;
    // Only register unknown non-seed boards once
    if (
      existing?.id &&
      !port.projects[existing.id] &&
      !existing.id.startsWith("js_pf_")
    ) {
      port.upsertProject(existing);
    }

    const targetId =
      urlProject ||
      getLockedProjectId() ||
      readSharedActiveProjectId() ||
      port.activeProjectId ||
      existing?.id;

    if (urlLock && targetId) {
      setWindowLocked(true, targetId);
      setLocked(true);
    } else {
      setLocked(isWindowLocked());
    }

    if (targetId && port.projects[targetId]) {
      if (existing?.id !== targetId) {
        if (noteProjectImport(targetId, "boot")) {
          applyingRemote.current = true;
          importJobsite(port.projects[targetId]);
          applyingRemote.current = false;
        }
      }
      // Local only — never broadcast during boot (stops multi-window thrash)
      usePortfolioStore.setState({ activeProjectId: targetId });
      if (!isWindowLocked() && !urlLock) {
        const shared = readSharedActiveProjectId();
        if (shared !== targetId) {
          writeSharedActiveProjectId(targetId);
        }
      }
      lastSavedKey.current = `${targetId}|${port.projects[targetId].updatedAt ?? ""}`;
    }

    if (urlView) {
      const allowed = [
        "feed",
        "report",
        "messages",
        "inspections",
        "desk",
        "project",
        "map",
        "schedule",
        "contacts",
        "materials",
      ] as const;
      if ((allowed as readonly string[]).includes(urlView)) {
        setView(urlView as (typeof allowed)[number]);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced portfolio save — never broadcasts, never rewrites shared active id
  useEffect(() => {
    if (!ready || applyingRemote.current) return;
    if (!jobsite?.id) return;

    const key = `${jobsite.id}|${jobsite.updatedAt ?? ""}`;
    if (key === lastSavedKey.current) return;

    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      if (applyingRemote.current) return;
      const cur = useJobsiteStore.getState().jobsite;
      if (!cur?.id) return;
      const k = `${cur.id}|${cur.updatedAt ?? ""}`;
      if (k === lastSavedKey.current) return;
      lastSavedKey.current = k;
      usePortfolioStore.getState().upsertProject(cur);
      // Keep portfolio active pointer local only
      if (usePortfolioStore.getState().activeProjectId !== cur.id) {
        usePortfolioStore.setState({ activeProjectId: cur.id });
      }
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [jobsite, ready]);

  // Follow shared active project when unlocked (remote windows only)
  useEffect(() => {
    return subscribeProjectSync((msg) => {
      if (msg.sourceWindowId === windowId.current) return;
      if (msg.type !== "active-changed") return;
      if (isWindowLocked()) return;
      if (isStabilityCircuitOpen()) {
        logStability(
          "remote-blocked",
          `circuit (${stabilityCircuitRemainingMs()}ms)`,
          msg.projectId,
        );
        return;
      }

      const curId = useJobsiteStore.getState().jobsite.id;
      if (!msg.projectId || msg.projectId === curId) return;

      const next = usePortfolioStore.getState().projects[msg.projectId];
      if (!next) return;

      if (!noteProjectImport(msg.projectId, "remote")) return;

      // Flush current board first (sync, no broadcast)
      const cur = useJobsiteStore.getState().jobsite;
      if (cur?.id) {
        usePortfolioStore.getState().upsertProject(cur);
      }

      applyingRemote.current = true;
      lastSavedKey.current = `${next.id}|${next.updatedAt ?? ""}`;
      importJobsite(next);
      usePortfolioStore.setState({ activeProjectId: next.id });
      requestAnimationFrame(() => {
        applyingRemote.current = false;
      });
    });
  }, [importJobsite]);

  const switchProject = useCallback(
    (projectId: string, opts?: { forceLocal?: boolean }) => {
      const port = usePortfolioStore.getState();
      const next = port.projects[projectId];
      if (!next) return;
      if (useJobsiteStore.getState().jobsite.id === projectId) return;

      if (!noteProjectImport(projectId, "user")) return;

      const cur = useJobsiteStore.getState().jobsite;
      if (cur?.id) port.upsertProject(cur);

      applyingRemote.current = true;
      lastSavedKey.current = `${next.id}|${next.updatedAt ?? ""}`;
      importJobsite(next);

      const lock = isWindowLocked() || opts?.forceLocal;
      if (lock) {
        setWindowLocked(true, projectId);
        setLocked(true);
        usePortfolioStore.setState({ activeProjectId: projectId });
      } else {
        usePortfolioStore.setState({ activeProjectId: projectId });
        writeSharedActiveProjectId(projectId);
        logStability("broadcast", "user project switch", projectId);
        broadcastProjectSync({ type: "active-changed", projectId });
      }

      try {
        const url = new URL(window.location.href);
        url.searchParams.set("project", projectId);
        if (lock) url.searchParams.set("lock", "1");
        else url.searchParams.delete("lock");
        window.history.replaceState({}, "", url.toString());
      } catch {
        /* ignore */
      }

      requestAnimationFrame(() => {
        applyingRemote.current = false;
      });
    },
    [importJobsite],
  );

  const toggleLock = useCallback(() => {
    const curId = useJobsiteStore.getState().jobsite.id;
    if (isWindowLocked()) {
      setWindowLocked(false);
      setLocked(false);
      const shared = readSharedActiveProjectId();
      if (shared && shared !== curId) {
        const next = usePortfolioStore.getState().projects[shared];
        if (next) {
          const cur = useJobsiteStore.getState().jobsite;
          if (cur?.id) usePortfolioStore.getState().upsertProject(cur);
          applyingRemote.current = true;
          lastSavedKey.current = `${next.id}|${next.updatedAt ?? ""}`;
          importJobsite(next);
          usePortfolioStore.setState({ activeProjectId: next.id });
          requestAnimationFrame(() => {
            applyingRemote.current = false;
          });
        }
      } else if (curId) {
        writeSharedActiveProjectId(curId);
        broadcastProjectSync({ type: "active-changed", projectId: curId });
      }
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("lock");
        window.history.replaceState({}, "", url.toString());
      } catch {
        /* ignore */
      }
    } else {
      setWindowLocked(true, curId);
      setLocked(true);
      try {
        const url = new URL(window.location.href);
        url.searchParams.set("lock", "1");
        if (curId) url.searchParams.set("project", curId);
        window.history.replaceState({}, "", url.toString());
      } catch {
        /* ignore */
      }
    }
  }, [importJobsite]);

  const openProjectWindows = useCallback((projectId?: string) => {
    const id = projectId ?? useJobsiteStore.getState().jobsite.id;
    openJobsiteWindow({
      projectId: id,
      view: "feed",
      name: `lpin-${id}-board`,
      width: 1100,
      height: 900,
    });
    openJobsiteWindow({
      projectId: id,
      view: "map",
      name: `lpin-${id}-map`,
      width: 1100,
      height: 900,
    });
    openJobsiteWindow({
      projectId: id,
      view: "schedule",
      name: `lpin-${id}-schedule`,
      width: 1200,
      height: 900,
    });
    openJobsiteWindow({
      projectId: id,
      view: "materials",
      name: `lpin-${id}-materials`,
      width: 1100,
      height: 900,
    });
  }, []);

  const openLockedCompare = useCallback((projectIds: string[]) => {
    projectIds.slice(0, 4).forEach((id, i) => {
      openJobsiteWindow({
        projectId: id,
        view:
          i === 0 ? "feed" : i === 1 ? "map" : i === 2 ? "schedule" : "desk",
        locked: true,
        name: `lpin-lock-${id}`,
        width: 1000,
        height: 860,
      });
    });
  }, []);

  return {
    ready,
    locked,
    panelOpen,
    setPanelOpen,
    /** True when thrash circuit is open (remote sync paused) */
    circuitOpen,
    circuitRemainingMs: circuitOpen ? stabilityCircuitRemainingMs() : 0,
    activeProjectId: jobsite.id || activeProjectId,
    jobsite,
    metaList,
    lists,
    stats,
    switchProject,
    toggleLock,
    openProjectWindows,
    openLockedCompare,
    windowId: windowId.current,
  };
}

export type ProjectWorkspace = ReturnType<typeof useProjectWorkspace>;

export function saveActiveToPortfolio(jobsite: Jobsite): void {
  usePortfolioStore.getState().upsertProject(jobsite);
}
