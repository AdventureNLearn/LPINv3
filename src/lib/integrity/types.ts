/**
 * Public integrity kernel — secular verification types only.
 * Operator SuperGrok skills may use richer private language;
 * product code maps into these labels.
 */

/** Claim / field judgment strength — tri-state only. */
export type TriStateScore = -1 | 0 | 1;

/**
 * What a score rests on (evidence-gate mechanism, plain labels).
 * - evidence: direct primary record or direct observation
 * - inference: conclusion drawn from evidence (must note reasoning)
 * - assumption: unverified premise — must stay visible
 * - unset: not classified yet
 */
export type BasisKind = "evidence" | "inference" | "assumption" | "unset";

export type GateMode = "clean" | "hold";

export interface HarborRule {
  id: string;
  text: string;
}

export interface PublicSurfaceFooter {
  short: string;
  product: string;
}
