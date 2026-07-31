import type {
  Claim,
  ClaimKind,
  ClaimPack,
  ClaimSource,
  FetchedPost,
  PostContext,
} from "./types";
import { defaultBasisKindForClaimKind } from "./domain";

function cid(n: number): string {
  return `C${String(n).padStart(2, "0")}`;
}

function sourceId(n: number): string {
  return `s${n}`;
}

/** Pull http(s) links from free text (for post metadata). */
export function extractLinks(text: string): string[] {
  if (!text) return [];
  const re = /https?:\/\/[^\s<>"')\]]+/gi;
  const found = text.match(re) ?? [];
  const cleaned = found.map((u) => u.replace(/[.,;:!?]+$/, ""));
  return [...new Set(cleaned)];
}

/** Split post text into candidate claim sentences / clauses. */
function splitUnits(text: string): string[] {
  const cleaned = text
    .replace(/\s+/g, " ")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return [];

  // Split on sentence ends, then on strong clause breaks
  const sentences = cleaned
    .split(/(?<=[.!?…])\s+|(?<=\n)\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  const units: string[] = [];
  for (const s of sentences) {
    if (s.length > 140 && /[;:—–-]/.test(s)) {
      const parts = s
        .split(/\s*[;:—–]\s+/)
        .map((p) => p.trim())
        .filter((p) => p.length > 12);
      if (parts.length > 1) {
        units.push(...parts);
        continue;
      }
    }
    // Split "and" / "while" only for long multi-claim lines
    if (s.length > 100 && /\b(?:and|while|but|whereas)\b/i.test(s)) {
      const parts = s
        .split(/\s+\b(?:and|while|but|whereas)\b\s+/i)
        .map((p) => p.trim())
        .filter((p) => p.length > 18);
      if (parts.length > 1 && parts.length <= 4) {
        units.push(...parts);
        continue;
      }
    }
    units.push(s);
  }

  // Dedupe near-identical
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of units) {
    const key = u.toLowerCase().slice(0, 80);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(u);
  }
  return out.slice(0, 12);
}

function classifyUnit(unit: string): ClaimKind {
  const t = unit.toLowerCase();
  if (
    /\b\d+\s*%|\bpercent\b|\b\d{1,3}(?:,\d{3})+\b|\b\d+\s*(million|billion|thousand)\b/i.test(
      unit,
    )
  ) {
    return "quantitative";
  }
  if (
    /\b(will|won't|going to|tomorrow|next week|by 20\d{2}|soon)\b/i.test(t)
  ) {
    return "predictive";
  }
  if (
    /\b(because|caused|leads to|results in|due to|therefore)\b/i.test(t)
  ) {
    return "causal";
  }
  if (
    /\b(said|says|claimed|according to|reported|announced|study finds)\b/i.test(
      t,
    )
  ) {
    return "attribution";
  }
  return "stated";
}

function kindBasis(kind: ClaimKind): string {
  switch (kind) {
    case "quantitative":
      return "Numbers claim. Find the original dataset or official count before scoring Supported.";
    case "predictive":
      return "Forward-looking claim. Cannot be fully verified until the event date; stays Unproven for now.";
    case "causal":
      return "Cause-and-effect claim. Needs more than correlation or a single anecdote.";
    case "attribution":
      return "Says someone said or found something. Prefer the primary source over a recap.";
    case "implied":
      return "Strong or absolute language. Treat as a separate claim that may overreach the evidence.";
    case "context":
      return "Context about the post or author — not a truth claim about the world.";
    default:
      return "Stated in the post. Score only after checking primary records.";
  }
}

function ensurePeriod(s: string): string {
  const t = s.trim();
  if (!t) return t;
  if (/[.!?…]$/.test(t)) return t;
  return `${t}.`;
}

function safeHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "link";
  }
}

function formatPosted(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

function buildImpliedClaims(text: string): string[] {
  const implied: string[] = [];
  const t = text.toLowerCase();
  if (/\bevery\b|\ball\b|\bno one\b|\balways\b|\bnever\b/.test(t)) {
    implied.push(
      "Absolute wording (“every / all / never”) may overstate what the evidence shows.",
    );
  }
  if (/\bproves?\b|\bproven\b|\bproof\b/i.test(t)) {
    implied.push(
      "The post uses “proof / proves” language — treat certainty as a separate claim.",
    );
  }
  if (/\bcritic\b|\bowes an apology\b|\bwrong\b/i.test(t)) {
    implied.push(
      "All prior critics of the subject were wrong (universal claim).",
    );
  }
  if (/\bbreaking\b|\bjust dropped\b|\bnew study\b/i.test(t)) {
    implied.push(
      "This is newly released information (timeliness claim).",
    );
  }
  if (/\bstudy\b|\bresearch\b|\bdata\b|\bnumbers are in\b/i.test(t)) {
    implied.push(
      "A study or dataset exists that supports the main claim (existence of evidence).",
    );
  }
  return implied.slice(0, 3);
}

function buildVerificationChecklist(
  post: FetchedPost,
  claims: Claim[],
): string[] {
  const items = [
    "Mark each claim only as Supported (+1), Unproven (0), or Disputed (−1).",
    "Label basis as Evidence, Inference, or Assumption — do not present inference as evidence.",
    "Prefer primary (original official) records over commentary.",
    "Likes, reposts, and views are not evidence of truth.",
  ];
  if (claims.some((c) => c.kind === "quantitative")) {
    items.push("For number claims: find the original dataset or official count.");
  }
  if (claims.some((c) => c.kind === "predictive")) {
    items.push("Future claims stay Unproven until the date passes or a primary schedule exists.");
  }
  if (post.externalLinks.length === 0) {
    items.push("No outbound links in the post — seek primary records yourself.");
  }
  if (post.communityNote) {
    items.push("Read the community note; it may flag open gaps.");
  }
  items.push("A person decides every score — software does not auto-truth.");
  return items;
}

/**
 * Build a claim pack from a fetched (or manual) post.
 * All scores start Unproven (0) unless context metadata is primary-backed.
 */
export function buildComprehensivePack(post: FetchedPost): ClaimPack {
  const units = splitUnits(post.text);
  const implied = buildImpliedClaims(post.text);
  const claims: Claim[] = [];
  let n = 0;
  let s = 0;
  const maxClaims = 10;

  const postSource = (): ClaimSource => ({
    id: sourceId(++s),
    label: "Original social post",
    kind: "none",
    url: post.url || undefined,
  });

  for (const unit of units) {
    if (n >= maxClaims - 2) break;
    const kind = classifyUnit(unit);
    n += 1;
    const linkSources: ClaimSource[] = post.externalLinks
      .slice(0, 2)
      .map((url) => ({
        id: sourceId(++s),
        label: safeHost(url),
        kind: "secondary" as const,
        url,
      }));
    claims.push({
      id: cid(n),
      text: ensurePeriod(unit),
      score: 0,
      honestyFlag: false,
      basisKind: defaultBasisKindForClaimKind(kind),
      kind,
      basis: kindBasis(kind),
      sources: [postSource(), ...linkSources],
    });
  }

  for (const imp of implied) {
    if (n >= maxClaims - 1) break;
    n += 1;
    claims.push({
      id: cid(n),
      text: ensurePeriod(imp),
      score: 0,
      honestyFlag: false,
      basisKind: "inference",
      kind: "implied",
      basis:
        "Inferred from wording (not quoted word-for-word). Review carefully — implied claims often overreach.",
      sources: [postSource()],
    });
  }

  // Context claim: provenance (not a world fact)
  if (post.authorHandle || post.authorName) {
    n += 1;
    claims.push({
      id: cid(n),
      text: `This post was published by ${post.authorName || "an X account"}${
        post.authorHandle
          ? ` (@${post.authorHandle.replace(/^@/, "")})`
          : ""
      }${post.postedAt ? ` on/around ${formatPosted(post.postedAt)}` : ""}.`,
      score: post.fetchSource === "manual" ? 0 : 1,
      honestyFlag: post.fetchSource === "manual",
      basisKind: post.fetchSource === "manual" ? "assumption" : "evidence",
      kind: "context",
      basis:
        post.fetchSource === "manual"
          ? "Author/date entered or assumed manually — confirm against the live post."
          : "Pulled from the public post metadata when the link was resolved. Context only — not evidence for the post’s world claims.",
      sources: [
        {
          id: sourceId(++s),
          label: "X post metadata",
          kind: post.fetchSource === "manual" ? "none" : "primary",
          url: post.url,
        },
      ],
    });
  }

  if (claims.length === 0) {
    claims.push({
      id: "C01",
      text: post.text || "No claim text available yet.",
      score: 0,
      honestyFlag: false,
      basisKind: "unset",
      kind: "stated",
      basis: "Awaiting clearer claim text.",
      sources: [postSource()],
    });
  }

  const context: PostContext = {
    authorName: post.authorName,
    authorHandle: post.authorHandle
      ? `@${post.authorHandle.replace(/^@/, "")}`
      : "",
    authorBio: post.authorBio,
    authorFollowers: post.authorFollowers,
    postedAt: post.postedAt,
    likes: post.likes,
    reposts: post.reposts,
    replies: post.replies,
    views: post.views,
    language: post.language,
    mediaSummary: post.mediaSummary,
    replyToText: post.replyToText,
    replyToHandle: post.replyToHandle,
    quoteText: post.quoteText,
    quoteHandle: post.quoteHandle,
    communityNote: post.communityNote,
    fetchSource: post.fetchSource,
    externalLinks: [...post.externalLinks],
    verificationChecklist: buildVerificationChecklist(post, claims),
  };

  const handle = post.authorHandle
    ? `@${post.authorHandle.replace(/^@/, "")}`
    : "";
  const title =
    post.text.trim().length > 72
      ? `${post.text.trim().slice(0, 69)}…`
      : post.text.trim() || "Untitled claim pack";

  return {
    id: `pack_${Date.now().toString(36)}`,
    title,
    postUrl: post.url,
    postText: post.text,
    authorHandle: handle,
    claims,
    createdAt: new Date().toISOString(),
    context,
  };
}

export function packFromManualPaste(input: {
  postUrl: string;
  postText: string;
  authorHandle?: string;
}): ClaimPack {
  return buildComprehensivePack({
    url: input.postUrl.trim(),
    statusId: "",
    text: input.postText.trim(),
    authorName: "",
    authorHandle: (input.authorHandle || "").replace(/^@/, ""),
    externalLinks: extractLinks(input.postText),
    fetchSource: "manual",
  });
}
