import type { BasisKind, HarborRule, PublicSurfaceFooter } from "./types";

export const LPIN_EXPANDED =
  "Light · Proof · Integrity · Navigation" as const;

export const HARBOR_RULES: HarborRule[] = [
  {
    id: "honest-unknown",
    text: "Prefer an honest “we do not know yet” over a polished false complete picture.",
  },
  {
    id: "primary-first",
    text: "Original records beat second-hand commentary.",
  },
  {
    id: "human-final",
    text: "A person makes the final call — not the software alone.",
  },
  {
    id: "open-gaps-block",
    text: "Open gaps block “clean” or “all clear” until a human resolves them.",
  },
  {
    id: "scope",
    text: "Not legal advice · not a city portal login · United States build · open project packs on this device.",
  },
];

export const PUBLIC_FOOTER: PublicSurfaceFooter = {
  short: "A person made every judgment. Not automated truth. LPINv3 tools.",
  product: "LPINv3 · Light · Proof · Integrity · Navigation · open packs",
};

export const SCORE_GUIDE = {
  supported:
    "+1 Supported — Backed by a primary record or direct observation you own.",
  unproven: "0 Unproven — Not shown yet. Default. Not the same as false.",
  disputed:
    "−1 Disputed — Open gap or contradiction. Blocks clean share until a human changes it.",
} as const;

export const BASIS_KIND_LABEL: Record<BasisKind, string> = {
  evidence: "Evidence",
  inference: "Inference",
  assumption: "Assumption",
  unset: "Not labeled",
};

export const JOBSITE_KERNEL_LINES = [
  "Phone-first reporting · desk view on PC",
  "All-clear blocked while P0 is open",
  "A person owns every status",
] as const;
