import type { ClaimPack } from "./types";
import { buildComprehensivePack } from "./infer";

/** Sample viral post for demos — mixed scores for training honesty. */
export const EXAMPLE_VIRAL_PACK: ClaimPack = {
  id: "pack_viral_example_001",
  title:
    "Sample viral post: “New study proves the housing program already works”",
  postUrl: "https://x.com/example/status/1948000000000000000",
  authorHandle: "@policywire_demo",
  createdAt: new Date().toISOString(),
  postText:
    "BREAKING: A major new study just dropped proving the federal housing program already cut homelessness 40% nationwide. Every critic who said it wouldn’t work owes an apology. Full results tomorrow — but the numbers are in.",
  context: {
    authorName: "Policy Wire Demo",
    authorHandle: "@policywire_demo",
    postedAt: new Date().toISOString(),
    likes: 12840,
    reposts: 3201,
    replies: 890,
    fetchSource: "example",
    externalLinks: [],
    verificationChecklist: [
      "Find the actual study (title, authors, publisher) — the post does not link it.",
      "Check national homelessness counts (e.g. HUD point-in-time) for a 40% drop.",
      "Treat “every critic was wrong” as a separate universal claim.",
      "“Full results tomorrow” stays Unproven until published.",
      "Likes and reposts are not evidence of truth.",
      "Label each score’s basis as Evidence, Inference, or Assumption.",
      "A person decides every score — not the software.",
    ],
  },
  claims: [
    {
      id: "C01",
      text: "A major new study has been published on the federal housing program.",
      score: 0,
      honestyFlag: false,
      basisKind: "assumption",
      kind: "attribution",
      basis:
        "The post says a study exists. No link to the actual study (primary record) is given yet.",
      sources: [
        { id: "s1", label: "Original social post only", kind: "none" },
      ],
    },
    {
      id: "C02",
      text: "The program cut homelessness 40% nationwide.",
      score: -1,
      honestyFlag: false,
      basisKind: "evidence",
      kind: "quantitative",
      basis:
        "No official national count (for example HUD point-in-time data) shows a 40% drop caused by this program. Open gap — marked Disputed.",
      sources: [
        {
          id: "s2",
          label: "HUD homelessness counts (no 40% drop shown)",
          kind: "primary",
          url: "https://www.hud.gov/",
        },
      ],
    },
    {
      id: "C03",
      text: "Every critic of the program was proven wrong.",
      score: -1,
      honestyFlag: false,
      basisKind: "inference",
      kind: "implied",
      basis:
        "Rhetorical universal claim. It depends on the 40% claim above, which is disputed.",
      sources: [],
    },
    {
      id: "C04",
      text: "Full study results will be released tomorrow.",
      score: 0,
      honestyFlag: false,
      basisKind: "assumption",
      kind: "predictive",
      basis: "About the future — cannot be verified yet. Stays Unproven.",
      sources: [],
    },
    {
      id: "C05",
      text: "A federal housing program is currently in effect.",
      score: 1,
      honestyFlag: false,
      basisKind: "evidence",
      kind: "stated",
      basis:
        "Supported by the agency’s own program pages (primary / original record).",
      sources: [
        {
          id: "s3",
          label: "HUD program page (primary / original record)",
          kind: "primary",
          url: "https://www.hud.gov/",
        },
      ],
    },
    {
      id: "C06",
      text: "The study is described as “major” by independent researchers.",
      score: 0,
      honestyFlag: true,
      basisKind: "inference",
      kind: "attribution",
      basis:
        "Sounds like press language. No independent researcher primary record cited. Honesty flag on: plausible, not fully proven.",
      sources: [
        { id: "s4", label: "Secondary recap (demo)", kind: "secondary" },
      ],
    },
  ],
};

/** @deprecated use packFromManualPaste from infer — kept as thin wrapper */
export function blankPackFromPaste(input: {
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
    externalLinks: [],
    fetchSource: "manual",
  });
}
