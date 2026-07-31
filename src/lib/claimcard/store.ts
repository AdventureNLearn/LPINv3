import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { BasisKind, Claim, ClaimPack, ClaimScore, FetchedPost } from "./types";
import {
  buildMarkdownPack,
  buildShareText,
  enforceHonesty,
  evaluateLayer0,
  setBasisKind,
  setClaimScore,
  toggleHonesty,
} from "./domain";
import { blankPackFromPaste, EXAMPLE_VIRAL_PACK } from "./examples";
import { buildComprehensivePack, packFromManualPaste } from "./infer";

interface ClaimcardState {
  pack: ClaimPack | null;
  step: "home" | "board" | "share";
  loadExample: () => void;
  createFromPaste: (input: {
    postUrl: string;
    postText: string;
    authorHandle?: string;
  }) => void;
  createFromFetched: (post: FetchedPost) => void;
  updateClaimScore: (id: string, score: ClaimScore) => void;
  toggleClaimHonesty: (id: string) => void;
  updateClaimBasis: (id: string, basis: string) => void;
  updateClaimBasisKind: (id: string, kind: BasisKind) => void;
  updateClaimText: (id: string, text: string) => void;
  setStep: (step: "home" | "board" | "share") => void;
  reset: () => void;
  getMarkdown: () => string;
  getShareText: () => string;
}

function mapClaim(claims: Claim[], id: string, fn: (c: Claim) => Claim): Claim[] {
  return claims.map((c) => (c.id === id ? enforceHonesty(fn(c)) : c));
}

function withDefaults(claim: Claim): Claim {
  return enforceHonesty({
    ...claim,
    basisKind: claim.basisKind ?? "unset",
    honestyFlag: Boolean(claim.honestyFlag),
    basis: claim.basis ?? "",
    sources: claim.sources ?? [],
  });
}

export const useClaimcardStore = create<ClaimcardState>()(
  persist(
    (set, get) => ({
      pack: null,
      step: "home",
      loadExample: () =>
        set({
          pack: {
            ...EXAMPLE_VIRAL_PACK,
            createdAt: new Date().toISOString(),
            claims: EXAMPLE_VIRAL_PACK.claims.map((c) =>
              withDefaults({
                ...c,
                sources: [...c.sources],
              }),
            ),
            context: EXAMPLE_VIRAL_PACK.context
              ? {
                  ...EXAMPLE_VIRAL_PACK.context,
                  externalLinks: [
                    ...EXAMPLE_VIRAL_PACK.context.externalLinks,
                  ],
                  verificationChecklist: [
                    ...EXAMPLE_VIRAL_PACK.context.verificationChecklist,
                  ],
                }
              : undefined,
          },
          step: "board",
        }),
      createFromPaste: (input) =>
        set({
          pack: packFromManualPaste(input),
          step: "board",
        }),
      createFromFetched: (post) =>
        set({
          pack: buildComprehensivePack(post),
          step: "board",
        }),
      updateClaimScore: (id, score) => {
        const pack = get().pack;
        if (!pack) return;
        set({
          pack: {
            ...pack,
            claims: mapClaim(pack.claims, id, (c) => setClaimScore(c, score)),
          },
        });
      },
      toggleClaimHonesty: (id) => {
        const pack = get().pack;
        if (!pack) return;
        set({
          pack: {
            ...pack,
            claims: mapClaim(pack.claims, id, (c) => toggleHonesty(c)),
          },
        });
      },
      updateClaimBasis: (id, basis) => {
        const pack = get().pack;
        if (!pack) return;
        set({
          pack: {
            ...pack,
            claims: mapClaim(pack.claims, id, (c) => ({ ...c, basis })),
          },
        });
      },
      updateClaimBasisKind: (id, kind) => {
        const pack = get().pack;
        if (!pack) return;
        set({
          pack: {
            ...pack,
            claims: mapClaim(pack.claims, id, (c) => setBasisKind(c, kind)),
          },
        });
      },
      updateClaimText: (id, text) => {
        const pack = get().pack;
        if (!pack) return;
        set({
          pack: {
            ...pack,
            claims: mapClaim(pack.claims, id, (c) => ({ ...c, text })),
          },
        });
      },
      setStep: (step) => set({ step }),
      reset: () => set({ pack: null, step: "home" }),
      getMarkdown: () => {
        const pack = get().pack;
        if (!pack) return "";
        return buildMarkdownPack(pack, evaluateLayer0(pack.claims));
      },
      getShareText: () => {
        const pack = get().pack;
        if (!pack) return "";
        return buildShareText(pack, evaluateLayer0(pack.claims));
      },
    }),
    {
      name: "aos-claimcard-v3",
      merge: (persisted, current) => {
        const p = persisted as Partial<ClaimcardState> | undefined;
        if (!p?.pack) return { ...current, ...p };
        return {
          ...current,
          ...p,
          pack: {
            ...p.pack,
            claims: (p.pack.claims || []).map((c) => withDefaults(c as Claim)),
          },
        };
      },
    },
  ),
);

// re-export for any leftover imports
export { blankPackFromPaste };
