/**
 * Public Surface Contract — runtime constants.
 * Full prose: /workspace/PUBLIC_SURFACE_CONTRACT.md
 *
 * Skills complement; apps stay secular civic tooling.
 */

import type { BasisKind, HarborRule, PublicSurfaceFooter } from "./types";

export const LPIN_EXPANDED =
  "Light · Proof · Integrity · Navigation" as const;

/** User-facing working rules — shared by LPIN Suite Claims, Jobsite, and home. */
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

/** Short lines for footers and share packs (no political/religious framing). */
export const PUBLIC_FOOTER: PublicSurfaceFooter = {
  short: "A person made every judgment. Not automated truth. LPIN Suite tools.",
  product:
    "LPIN Suite · Light · Proof · Integrity · Navigation · open packs",
};

export const SCORE_GUIDE = {
  supported:
    "+1 Supported — Backed by a primary record (original official source) or direct observation you own.",
  unproven:
    "0 Unproven — Not shown yet. Default. Not the same as false.",
  disputed:
    "−1 Disputed — Open gap or contradiction. Blocks clean share until a human changes it.",
  honesty:
    "Honesty flag — Plausible, but no primary record yet. Keep uncertainty visible.",
  cleanShare:
    "Clean share gate — Only when no claim is still −1. You decide every score.",
  basis:
    "Basis kind — Evidence (primary/direct), Inference (drawn from evidence), or Assumption (unverified premise).",
} as const;

export const BASIS_KIND_LABEL: Record<BasisKind, string> = {
  evidence: "Evidence",
  inference: "Inference",
  assumption: "Assumption",
  unset: "Not labeled",
};

export const BASIS_KIND_HELP: Record<BasisKind, string> = {
  evidence: "Direct quote, data, or original official record + how you checked it.",
  inference: "Logical step from evidence — write the short reasoning note.",
  assumption: "Unverified starting point — must stay flagged, never presented as proven.",
  unset: "Not classified yet — default until you choose.",
};

/** Patterns that must not appear in public UI / share / export (secular surface). */
const BANNED_PUBLIC_PATTERNS: RegExp[] = [
  /\bchrist\s+is\s+king\b/i,
  /\bamerica\s+first\b/i,
  /\bmission\s+spine\b/i,
  /\bsovereign\s+lens\b/i,
  /\bshatter\s*protocol\b/i,
  /\bfrog\s+protocol\b/i,
  /\b🐸\s*shatter\b/i,
  /\bevidence-gate\b/i,
  /\bpermit-coordinator\b/i,
  /\bcivic-intelligence-coordinator\b/i,
  /\breasoning-architect\b/i,
  /\blayer-0\b/i,
  /\bagnostic-evidence\b/i,
];

export function sanitizeForPublicSurface(text: string): string {
  let out = text;
  for (const re of BANNED_PUBLIC_PATTERNS) {
    out = out.replace(re, "[removed]");
  }
  return out;
}

export function isPublicSurfaceSafe(text: string): boolean {
  return !BANNED_PUBLIC_PATTERNS.some((re) => re.test(text));
}

export const CLAIMCARD_KERNEL_LINES = [
  "Tri-state only: Supported (+1), Unproven (0), Disputed (−1).",
  "Label the basis: Evidence, Inference, or Assumption.",
  "Open disputes (−1) block clean share until a person clears them.",
  "Prefer primary records over second-hand recaps.",
] as const;

export const JOBSITE_KERNEL_LINES = [
  "Stop-now (P0) stays visible until a person closes it — mark-seen is not fixed.",
  "Failed inspections and open P0 block “all clear.”",
  "Wired lanes keep report → message → inspection linked on your board.",
  "Building-department lane is a team copy — not a city login.",
  "United States build; project packs are open JSON you control.",
] as const;
