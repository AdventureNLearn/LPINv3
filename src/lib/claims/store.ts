import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BasisKind, TriStateScore } from "@/lib/integrity";
import { uid } from "@/lib/utils";

export interface ClaimItem {
  id: string;
  text: string;
  score: TriStateScore;
  basis: BasisKind;
  note: string;
}

interface ClaimsState {
  sourceLabel: string;
  claims: ClaimItem[];
  setSourceLabel: (v: string) => void;
  addClaim: (text: string) => void;
  updateClaim: (id: string, patch: Partial<ClaimItem>) => void;
  removeClaim: (id: string) => void;
  resetDemo: () => void;
}

const DEMO: ClaimItem[] = [
  {
    id: "c1",
    text: "The project passed final inspection last week.",
    score: -1,
    basis: "assumption",
    note: "No primary inspection record attached yet.",
  },
  {
    id: "c2",
    text: "Storm drain work is on the active field board as P0.",
    score: 1,
    basis: "evidence",
    note: "Matches open P0 report on the Jobsite board (this device).",
  },
  {
    id: "c3",
    text: "All materials are on site for the curtain wall.",
    score: 0,
    basis: "unset",
    note: "Materials line shows a short — leave unproven.",
  },
];

export function hasDisputed(claims: ClaimItem[]): boolean {
  return claims.some((c) => c.score === -1);
}

export const useClaimsStore = create<ClaimsState>()(
  persist(
    (set) => ({
      sourceLabel: "Sample public claim set (demo)",
      claims: DEMO,
      setSourceLabel: (sourceLabel) => set({ sourceLabel }),
      addClaim: (text) =>
        set((s) => ({
          claims: [
            {
              id: uid("cl"),
              text: text.trim(),
              score: 0,
              basis: "unset",
              note: "",
            },
            ...s.claims,
          ],
        })),
      updateClaim: (id, patch) =>
        set((s) => ({
          claims: s.claims.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      removeClaim: (id) =>
        set((s) => ({ claims: s.claims.filter((c) => c.id !== id) })),
      resetDemo: () => set({ sourceLabel: "Sample public claim set (demo)", claims: DEMO }),
    }),
    { name: "lpin-mobile-claims-v1" },
  ),
);
