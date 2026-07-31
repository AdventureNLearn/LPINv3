import {
  BASIS_KIND_LABEL,
  PUBLIC_FOOTER,
  sanitizeForPublicSurface,
} from "@/lib/integrity";
import type {
  BasisKind,
  Claim,
  ClaimPack,
  ClaimScore,
  Layer0Status,
  ShareMode,
} from "./types";

function normalizeClaim(claim: Claim): Claim {
  return {
    ...claim,
    basisKind: claim.basisKind ?? "unset",
    honestyFlag: Boolean(claim.honestyFlag),
    basis: claim.basis ?? "",
    sources: claim.sources ?? [],
  };
}

/** +1 without primary must carry honesty_flag; otherwise force 0. */
export function enforceHonesty(claim: Claim): Claim {
  const c = normalizeClaim(claim);
  const hasPrimary = c.sources.some((s) => s.kind === "primary");
  if (c.score === 1 && !hasPrimary && !c.honestyFlag) {
    return { ...c, score: 0 };
  }
  // +1 as "evidence" without primary → force honesty flag path (or demote basis)
  if (
    c.score === 1 &&
    !hasPrimary &&
    c.basisKind === "evidence" &&
    c.honestyFlag
  ) {
    return { ...c, basisKind: "inference" };
  }
  return c;
}

export function setClaimScore(claim: Claim, score: ClaimScore): Claim {
  return enforceHonesty({ ...normalizeClaim(claim), score });
}

export function setBasisKind(claim: Claim, basisKind: BasisKind): Claim {
  return enforceHonesty({ ...normalizeClaim(claim), basisKind });
}

export function toggleHonesty(claim: Claim): Claim {
  const c = normalizeClaim(claim);
  return enforceHonesty({ ...c, honestyFlag: !c.honestyFlag });
}

export function evaluateLayer0(claims: Claim[]): Layer0Status {
  const list = claims.map(normalizeClaim);
  const openDisputes = list.filter((c) => c.score === -1).map((c) => c.id);
  const unsupportedPlusOnes = list
    .filter((c) => {
      const hasPrimary = c.sources.some((s) => s.kind === "primary");
      return c.score === 1 && !hasPrimary && !c.honestyFlag;
    })
    .map((c) => c.id);

  const weakEvidence = list
    .filter((c) => {
      const hasPrimary = c.sources.some((s) => s.kind === "primary");
      return c.score === 1 && c.basisKind === "evidence" && !hasPrimary;
    })
    .map((c) => c.id);

  return {
    canShareClean: openDisputes.length === 0,
    openDisputes,
    unsupportedPlusOnes,
    weakEvidence,
    histogram: {
      supported: list.filter((c) => c.score === 1).length,
      unproven: list.filter((c) => c.score === 0).length,
      disputed: list.filter((c) => c.score === -1).length,
    },
    basisHistogram: {
      evidence: list.filter((c) => c.basisKind === "evidence").length,
      inference: list.filter((c) => c.basisKind === "inference").length,
      assumption: list.filter((c) => c.basisKind === "assumption").length,
      unset: list.filter((c) => c.basisKind === "unset").length,
    },
  };
}

export function shareMode(status: Layer0Status): ShareMode {
  if (!status.canShareClean) return "blocked";
  if (status.histogram.disputed > 0) return "disputed";
  return "clean";
}

export function buildMarkdownPack(pack: ClaimPack, status: Layer0Status): string {
  const mode = status.canShareClean ? "CLEAN" : "HOLD (open −1 claims)";
  const ctx = pack.context;
  const lines: string[] = [
    `# LPIN Suite Claims pack — ${mode}`,
    "",
    `**Source post:** ${pack.postUrl || "(pasted text only)"}`,
    `**Author:** ${pack.authorHandle || ctx?.authorName || "unknown"}`,
    `**Title:** ${pack.title}`,
    `**Generated:** ${new Date().toISOString()}`,
    "",
  ];

  if (ctx) {
    lines.push("## Post context (pulled from link when available)");
    if (ctx.authorName) lines.push(`- Author name: ${ctx.authorName}`);
    if (ctx.authorHandle) lines.push(`- Handle: ${ctx.authorHandle}`);
    if (ctx.postedAt) lines.push(`- Posted: ${ctx.postedAt}`);
    if (ctx.likes != null)
      lines.push(`- Likes: ${ctx.likes} (not evidence of truth)`);
    if (ctx.reposts != null) lines.push(`- Reposts: ${ctx.reposts}`);
    if (ctx.replies != null) lines.push(`- Replies: ${ctx.replies}`);
    if (ctx.views != null) lines.push(`- Views: ${ctx.views}`);
    if (ctx.mediaSummary) lines.push(`- Media: ${ctx.mediaSummary}`);
    if (ctx.quoteText)
      lines.push(
        `- Quoted post${ctx.quoteHandle ? ` (@${ctx.quoteHandle})` : ""}: ${ctx.quoteText}`,
      );
    if (ctx.replyToHandle) lines.push(`- Reply to: @${ctx.replyToHandle}`);
    if (ctx.communityNote) lines.push(`- Community note: ${ctx.communityNote}`);
    if (ctx.externalLinks.length)
      lines.push(`- Links in post: ${ctx.externalLinks.join(", ")}`);
    lines.push(`- Fetch source: ${ctx.fetchSource}`);
    lines.push("");
    if (ctx.verificationChecklist.length) {
      lines.push("## Verification checklist");
      for (const item of ctx.verificationChecklist) {
        lines.push(`- [ ] ${item}`);
      }
      lines.push("");
    }
  }

  lines.push(
    "## How to read scores",
    "- +1 Supported = backed by a primary (original official) record",
    "- 0 Unproven = not proven yet (not the same as false)",
    "- −1 Disputed = open gap or contradiction",
    "- Basis: Evidence / Inference / Assumption — what the score rests on",
    "",
    "## Integrity summary",
    `- Supported (+1): ${status.histogram.supported}`,
    `- Unproven (0): ${status.histogram.unproven}`,
    `- Disputed (−1): ${status.histogram.disputed}`,
    `- Basis — Evidence: ${status.basisHistogram.evidence} · Inference: ${status.basisHistogram.inference} · Assumption: ${status.basisHistogram.assumption} · Unset: ${status.basisHistogram.unset}`,
    status.canShareClean
      ? "- Clean share gate: no open disputes — clean share allowed"
      : `- Clean share gate HOLD: open disputes → ${status.openDisputes.join(", ")}`,
    "",
    "## Full post text",
    "",
    pack.postText || "(empty)",
    "",
    "## Claims",
    "",
  );

  for (const raw of pack.claims) {
    const c = normalizeClaim(raw);
    const label =
      c.score === 1 ? "Supported" : c.score === -1 ? "Disputed" : "Unproven";
    const kind = c.kind ? ` · ${c.kind}` : "";
    lines.push(
      `### ${c.id} — ${label} (${c.score > 0 ? "+" : ""}${c.score})${kind}`,
    );
    lines.push(c.text);
    lines.push(`Basis kind: ${BASIS_KIND_LABEL[c.basisKind]}`);
    if (c.honestyFlag)
      lines.push(
        "_Honesty flag: plausible, but not fully proven with a primary record_",
      );
    if (c.basis) lines.push(`Notes: ${c.basis}`);
    if (c.sources.length) {
      lines.push(
        "Sources: " +
          c.sources
            .map((s) => {
              const sk =
                s.kind === "primary"
                  ? "primary / original record"
                  : s.kind === "secondary"
                    ? "secondary / commentary"
                    : "none";
              return `${s.label} [${sk}]${s.url ? ` ${s.url}` : ""}`;
            })
            .join("; "),
      );
    }
    lines.push("");
  }

  lines.push("---");
  lines.push(`_${PUBLIC_FOOTER.short}_`);
  return sanitizeForPublicSurface(lines.join("\n"));
}

export function buildShareText(pack: ClaimPack, status: Layer0Status): string {
  const mode = status.canShareClean ? "clean pack" : "hold pack";
  const { supported, unproven, disputed } = status.histogram;
  const text = [
    `LPIN Suite Claims ${mode}: ${pack.title}`,
    `Supported ${supported} · Unproven ${unproven} · Disputed ${disputed}`,
    `Basis — E ${status.basisHistogram.evidence} · I ${status.basisHistogram.inference} · A ${status.basisHistogram.assumption}`,
    pack.authorHandle ? `Author ${pack.authorHandle}` : "",
    status.canShareClean
      ? "No open disputes — human-reviewed export."
      : `Open disputes block clean share: ${status.openDisputes.join(", ")}`,
    PUBLIC_FOOTER.short,
  ]
    .filter(Boolean)
    .join("\n");
  return sanitizeForPublicSurface(text);
}

export function scoreLabel(score: ClaimScore): string {
  if (score === 1) return "Supported (+1)";
  if (score === -1) return "Disputed (−1)";
  return "Unproven (0)";
}

export function claimKindLabel(kind?: string): string {
  switch (kind) {
    case "stated":
      return "Stated in post";
    case "implied":
      return "Implied";
    case "quantitative":
      return "Numbers / quantity";
    case "causal":
      return "Cause & effect";
    case "predictive":
      return "Future / prediction";
    case "attribution":
      return "Attribution";
    case "context":
      return "Post context";
    default:
      return "Claim";
  }
}

export function defaultBasisKindForClaimKind(
  kind?: string,
): BasisKind {
  switch (kind) {
    case "implied":
    case "causal":
      return "inference";
    case "predictive":
      return "assumption";
    case "context":
      return "evidence";
    default:
      return "unset";
  }
}
