import { createFileRoute } from "@tanstack/react-router";
import { ClaimcardApp } from "@/components/claimcard/ClaimcardApp";

export const Route = createFileRoute("/claims")({
  component: ClaimsPage,
  head: () => ({
    meta: [
      {
        title: "Claims · LPIN Suite",
      },
      {
        name: "description",
        content:
          "LPIN Suite Claims — paste a public post, break it into claims, score Supported / Unproven / Disputed. Clean share only when open disputes are closed.",
      },
    ],
  }),
});

function ClaimsPage() {
  return <ClaimcardApp />;
}
