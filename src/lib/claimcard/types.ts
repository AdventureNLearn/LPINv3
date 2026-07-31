import type { BasisKind } from "@/lib/integrity";

/** Claim score: tri-state only. Never invent other values. */
export type ClaimScore = -1 | 0 | 1;

export type SourceKind = "primary" | "secondary" | "none";

export type ClaimKind =
  | "stated"
  | "implied"
  | "quantitative"
  | "causal"
  | "predictive"
  | "attribution"
  | "context";

export type { BasisKind };

export interface ClaimSource {
  id: string;
  label: string;
  kind: SourceKind;
  url?: string;
}

export interface Claim {
  id: string;
  text: string;
  score: ClaimScore;
  /** Required when score is +1 without a primary source */
  honestyFlag: boolean;
  /**
   * What the score rests on (public integrity kernel).
   * evidence | inference | assumption | unset
   */
  basisKind: BasisKind;
  basis: string;
  sources: ClaimSource[];
  /** How this claim was derived for the comprehensive pack */
  kind?: ClaimKind;
}

/** Extra context pulled when resolving an X/Twitter link. */
export interface PostContext {
  authorName: string;
  authorHandle: string;
  authorBio?: string;
  authorFollowers?: number;
  postedAt?: string;
  likes?: number;
  reposts?: number;
  replies?: number;
  views?: number;
  language?: string;
  mediaSummary?: string;
  /** Text of a post this one replies to, if available */
  replyToText?: string;
  replyToHandle?: string;
  /** Quoted post text, if any */
  quoteText?: string;
  quoteHandle?: string;
  communityNote?: string;
  /** Where we successfully fetched from */
  fetchSource: "fxtwitter" | "vxtwitter" | "oembed" | "manual" | "example";
  /** External links found in the post */
  externalLinks: string[];
  /** Short verification checklist for the human reviewer */
  verificationChecklist: string[];
}

export interface ClaimPack {
  id: string;
  title: string;
  postUrl: string;
  postText: string;
  authorHandle: string;
  claims: Claim[];
  createdAt: string;
  context?: PostContext;
}

export type ShareMode = "clean" | "disputed" | "blocked";

export interface Layer0Status {
  canShareClean: boolean;
  openDisputes: string[];
  unsupportedPlusOnes: string[];
  /** +1 scored as Evidence without primary — soft hold signal */
  weakEvidence: string[];
  histogram: { supported: number; unproven: number; disputed: number };
  basisHistogram: {
    evidence: number;
    inference: number;
    assumption: number;
    unset: number;
  };
}

/** Normalized post after fetch (before claim inference). */
export interface FetchedPost {
  url: string;
  statusId: string;
  text: string;
  authorName: string;
  authorHandle: string;
  authorBio?: string;
  authorFollowers?: number;
  postedAt?: string;
  likes?: number;
  reposts?: number;
  replies?: number;
  views?: number;
  language?: string;
  mediaSummary?: string;
  replyToText?: string;
  replyToHandle?: string;
  quoteText?: string;
  quoteHandle?: string;
  communityNote?: string;
  externalLinks: string[];
  fetchSource: PostContext["fetchSource"];
}
