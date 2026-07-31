export type BasisKind = "evidence" | "inference" | "assumption" | "unset";
export type GateMode = "clean" | "hold";
export type TriStateScore = 1 | 0 | -1;

export interface HarborRule {
  id: string;
  text: string;
}

export interface PublicSurfaceFooter {
  short: string;
  product: string;
}
