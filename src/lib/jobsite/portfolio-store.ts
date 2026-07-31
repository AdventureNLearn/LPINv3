/**
 * Device-local multi-project portfolio for Jobsite.
 * Holds ~50 seed projects + user lists; active board still lives in useJobsiteStore.
 */

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { catalogStats, PROJECT_SEED_VERSION } from "./project-catalog";
import { createSeedPortfolio, metaToJobsite } from "./project-seed";
import type {
  PortfolioState,
  ProjectList,
  ProjectMeta,
} from "./project-types";
import type { ConstructionIndustry, Jobsite } from "./types";
import { newId } from "./domain";
import {
  broadcastProjectSync,
  isWindowLocked,
  readSharedActiveProjectId,
  writeSharedActiveProjectId,
} from "./project-sync";

interface PortfolioApi {
  ready: boolean;
  seedVersion: number;
  projects: Record<string, Jobsite>;
  meta: Record<string, ProjectMeta>;
  lists: ProjectList[];
  activeProjectId: string;
  ensureSeeded: () => void;
  reseedBaseline: (keepUserEdits?: boolean) => void;
  upsertProject: (jobsite: Jobsite, metaPatch?: Partial<ProjectMeta>) => void;
  removeProject: (id: string) => void;
  setActiveProjectId: (id: string, opts?: { broadcast?: boolean }) => void;
  getProject: (id: string) => Jobsite | undefined;
  listMeta: () => ProjectMeta[];
  resolveListMembers: (list: ProjectList) => ProjectMeta[];
  addList: (input: {
    name: string;
    description?: string;
    projectIds?: string[];
    match?: ProjectList["match"];
  }) => string;
  updateList: (id: string, patch: Partial<ProjectList>) => void;
  removeList: (id: string) => void;
  toggleListProject: (listId: string, projectId: string) => void;
  stats: () => ReturnType<typeof catalogStats>;
}

function metaFromJobsite(
  j: Jobsite,
  prev?: ProjectMeta,
): ProjectMeta {
  return {
    id: j.id,
    name: j.name,
    city: prev?.city ?? j.cityState?.split(",")[0]?.trim() ?? "United States",
    stateCode: (j.stateCode || prev?.stateCode || "US").toUpperCase().slice(0, 2),
    industry: (j.industry || prev?.industry || "commercial") as ConstructionIndustry,
    env: prev?.env ?? [],
    interests: prev?.interests ?? [],
    phase: prev?.phase ?? "structure",
    lat: j.siteGeo?.pin?.lat ?? prev?.lat ?? 39.5,
    lon: j.siteGeo?.pin?.lon ?? prev?.lon ?? -98.35,
    permitOffice: j.permittingOffice || prev?.permitOffice || "Building department",
    captain: j.captainName || prev?.captain || "Site lead",
    blurb: prev?.blurb ?? j.notes?.split("\n")[0] ?? "",
    materialsBudget: j.materialsBudget ?? prev?.materialsBudget,
    startOffsetDays: prev?.startOffsetDays ?? -30,
  };
}

function mergeSeed(existing: PortfolioState | null): PortfolioState {
  const seed = createSeedPortfolio(
    existing?.activeProjectId || readSharedActiveProjectId() || undefined,
  );
  if (!existing || existing.seedVersion !== PROJECT_SEED_VERSION) {
    // Prefer seed boards; keep any user projects (non js_pf_*) and custom lists
    if (!existing) return seed;
    const projects = { ...seed.projects };
    const meta = { ...seed.meta };
    for (const [id, j] of Object.entries(existing.projects)) {
      if (!id.startsWith("js_pf_")) {
        projects[id] = j;
        meta[id] = existing.meta[id] ?? metaFromJobsite(j);
      } else if (!j.isDemo) {
        // user edited a seed board — keep edits
        projects[id] = j;
        meta[id] = existing.meta[id] ?? metaFromJobsite(j, seed.meta[id]);
      }
    }
    const customLists = existing.lists.filter((l) => !l.builtIn);
    const lists = [
      ...seed.lists.filter((l) => l.builtIn),
      ...customLists,
    ];
    return {
      ...seed,
      projects,
      meta,
      lists,
      activeProjectId:
        projects[existing.activeProjectId]
          ? existing.activeProjectId
          : seed.activeProjectId,
      updatedAt: new Date().toISOString(),
    };
  }
  return existing;
}

export const usePortfolioStore = create<PortfolioApi>()(
  persist(
    (set, get) => ({
      ready: false,
      seedVersion: 0,
      projects: {},
      meta: {},
      lists: [],
      activeProjectId: "",

      ensureSeeded: () => {
        const cur = get();
        const sample = Object.values(cur.projects)[0] as
          | { fieldComms?: { messages?: unknown[] }; org?: unknown }
          | undefined;
        const scaleMissing =
          Boolean(sample) &&
          (!sample?.org ||
            !sample?.fieldComms?.messages ||
            sample.fieldComms.messages.length < 8);
        if (
          cur.ready &&
          cur.seedVersion === PROJECT_SEED_VERSION &&
          Object.keys(cur.projects).length >= 40 &&
          !scaleMissing
        ) {
          return;
        }
        // Force reseed path when scale surfaces missing (even if version matches)
        const versionForMerge = scaleMissing
          ? 0
          : cur.seedVersion;
        const merged = mergeSeed({
          version: 1,
          projects: cur.projects,
          meta: cur.meta,
          lists: cur.lists,
          activeProjectId: cur.activeProjectId,
          seedVersion: versionForMerge,
          updatedAt: new Date().toISOString(),
        });
        set({
          ready: true,
          seedVersion: merged.seedVersion,
          projects: merged.projects,
          meta: merged.meta,
          lists: merged.lists,
          activeProjectId: merged.activeProjectId,
        });
        writeSharedActiveProjectId(merged.activeProjectId);
      },

      reseedBaseline: (keepUserEdits = true) => {
        const cur = get();
        const seed = createSeedPortfolio(cur.activeProjectId);
        if (!keepUserEdits) {
          set({
            ready: true,
            seedVersion: seed.seedVersion,
            projects: seed.projects,
            meta: seed.meta,
            lists: seed.lists,
            activeProjectId: seed.activeProjectId,
          });
        } else {
          const projects = { ...seed.projects };
          const meta = { ...seed.meta };
          for (const [id, j] of Object.entries(cur.projects)) {
            if (!id.startsWith("js_pf_") || !j.isDemo) {
              projects[id] = j;
              meta[id] = cur.meta[id] ?? metaFromJobsite(j, seed.meta[id]);
            }
          }
          const customLists = cur.lists.filter((l) => !l.builtIn);
          set({
            ready: true,
            seedVersion: seed.seedVersion,
            projects,
            meta,
            lists: [...seed.lists.filter((l) => l.builtIn), ...customLists],
            activeProjectId: projects[cur.activeProjectId]
              ? cur.activeProjectId
              : seed.activeProjectId,
          });
        }
        broadcastProjectSync({ type: "portfolio-reseeded" });
      },

      upsertProject: (jobsite, metaPatch) => {
        const id = jobsite.id;
        if (!id) return;
        const prevBoard = get().projects[id];
        // Skip no-op writes — stops persist thrash / UI bounce
        if (
          prevBoard &&
          prevBoard.updatedAt === jobsite.updatedAt &&
          prevBoard.name === jobsite.name &&
          !metaPatch
        ) {
          return;
        }
        const prev = get().meta[id];
        const meta = { ...metaFromJobsite(jobsite, prev), ...metaPatch, id };
        set({
          projects: { ...get().projects, [id]: jobsite },
          meta: { ...get().meta, [id]: meta },
        });
      },

      removeProject: (id) => {
        const projects = { ...get().projects };
        const meta = { ...get().meta };
        delete projects[id];
        delete meta[id];
        const lists = get().lists.map((l) => ({
          ...l,
          projectIds: l.projectIds.filter((x) => x !== id),
        }));
        let activeProjectId = get().activeProjectId;
        if (activeProjectId === id) {
          activeProjectId = Object.keys(projects)[0] ?? "";
        }
        set({ projects, meta, lists, activeProjectId });
      },

      setActiveProjectId: (id, opts) => {
        if (!get().projects[id]) return;
        if (get().activeProjectId !== id) {
          set({ activeProjectId: id });
        }
        // Only broadcast on explicit user switch (opts.broadcast === true)
        if (opts?.broadcast === true && !isWindowLocked()) {
          writeSharedActiveProjectId(id);
          broadcastProjectSync({ type: "active-changed", projectId: id });
        }
      },

      getProject: (id) => get().projects[id],

      listMeta: () =>
        Object.values(get().meta).sort((a, b) =>
          a.name.localeCompare(b.name),
        ),

      resolveListMembers: (list) => {
        const all = get().listMeta();
        const byId = new Set(list.projectIds);
        let rows = all.filter((m) => byId.has(m.id));
        // If match rules present and projectIds empty, resolve dynamically
        if (list.match && list.projectIds.length === 0) {
          rows = all.filter((m) => {
            const ind =
              !list.match!.industries?.length ||
              list.match!.industries.includes(m.industry);
            const env =
              !list.match!.env?.length ||
              list.match!.env.some((e) => m.env.includes(e));
            const interest =
              !list.match!.interests?.length ||
              list.match!.interests.some((t) => m.interests.includes(t));
            const st =
              !list.match!.stateCodes?.length ||
              list.match!.stateCodes.includes(m.stateCode);
            return ind && env && interest && st;
          });
        }
        // Refresh built-in match lists from current meta when match set
        if (list.builtIn && list.match) {
          rows = all.filter((m) => {
            const ind =
              !list.match!.industries?.length ||
              list.match!.industries.includes(m.industry);
            const env =
              !list.match!.env?.length ||
              list.match!.env.some((e) => m.env.includes(e));
            const interest =
              !list.match!.interests?.length ||
              list.match!.interests.some((t) => m.interests.includes(t));
            const st =
              !list.match!.stateCodes?.length ||
              list.match!.stateCodes.includes(m.stateCode);
            return ind && env && interest && st;
          });
        }
        return rows;
      },

      addList: (input) => {
        const id = newId("list");
        const list: ProjectList = {
          id,
          name: input.name.trim() || "Untitled list",
          description: input.description?.trim(),
          projectIds: input.projectIds ?? [],
          match: input.match,
          builtIn: false,
          updatedAt: new Date().toISOString(),
        };
        set({ lists: [list, ...get().lists] });
        broadcastProjectSync({ type: "lists-changed" });
        return id;
      },

      updateList: (id, patch) => {
        set({
          lists: get().lists.map((l) =>
            l.id === id
              ? {
                  ...l,
                  ...patch,
                  id: l.id,
                  builtIn: l.builtIn,
                  updatedAt: new Date().toISOString(),
                }
              : l,
          ),
        });
        broadcastProjectSync({ type: "lists-changed" });
      },

      removeList: (id) => {
        const target = get().lists.find((l) => l.id === id);
        if (target?.builtIn) return;
        set({ lists: get().lists.filter((l) => l.id !== id) });
        broadcastProjectSync({ type: "lists-changed" });
      },

      toggleListProject: (listId, projectId) => {
        set({
          lists: get().lists.map((l) => {
            if (l.id !== listId || l.builtIn) return l;
            const has = l.projectIds.includes(projectId);
            return {
              ...l,
              projectIds: has
                ? l.projectIds.filter((x) => x !== projectId)
                : [...l.projectIds, projectId],
              updatedAt: new Date().toISOString(),
            };
          }),
        });
        broadcastProjectSync({ type: "lists-changed" });
      },

      stats: () => catalogStats(get().listMeta()),
    }),
    {
      name: "lpin-jobsite-portfolio-v1",
      version: 1,
      // Debounce huge portfolio writes — prevents UI freeze / "bounce" on multi-window
      storage: createJSONStorage(() => {
        let timer: ReturnType<typeof setTimeout> | null = null;
        let pending: { name: string; value: string } | null = null;
        const api = {
          getItem: (name: string) =>
            typeof localStorage === "undefined"
              ? null
              : localStorage.getItem(name),
          setItem: (name: string, value: string) => {
            pending = { name, value };
            if (timer) clearTimeout(timer);
            timer = setTimeout(() => {
              if (!pending || typeof localStorage === "undefined") return;
              try {
                localStorage.setItem(pending.name, pending.value);
              } catch {
                /* quota */
              }
              pending = null;
            }, 1200);
          },
          removeItem: (name: string) => {
            if (timer) clearTimeout(timer);
            pending = null;
            if (typeof localStorage !== "undefined") localStorage.removeItem(name);
          },
        };
        return api;
      }),
      partialize: (s) =>
        ({
          seedVersion: s.seedVersion,
          projects: s.projects,
          meta: s.meta,
          lists: s.lists,
          activeProjectId: s.activeProjectId,
        }) as unknown as PortfolioApi,
      onRehydrateStorage: () => (state) => {
        queueMicrotask(() => {
          usePortfolioStore.getState().ensureSeeded();
        });
        if (state) state.ready = true;
      },
    },
  ),
);

/** Ensure a jobsite exists in portfolio when user starts a brand-new board. */
export function registerJobsiteInPortfolio(jobsite: Jobsite): void {
  usePortfolioStore.getState().upsertProject(jobsite);
  // Local only — never broadcast on create (user is still on this board)
  usePortfolioStore.getState().setActiveProjectId(jobsite.id, {
    broadcast: false,
  });
  if (!isWindowLocked()) {
    writeSharedActiveProjectId(jobsite.id);
  }
}

export function rebuildMetaFromCatalog(): void {
  const seed = createSeedPortfolio();
  const st = usePortfolioStore.getState();
  for (const [id, m] of Object.entries(seed.meta)) {
    if (!st.projects[id]) {
      st.upsertProject(metaToJobsite(m), m);
    }
  }
}
