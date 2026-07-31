import { createFileRoute } from "@tanstack/react-router";
import { ClaimsApp } from "@/components/claims/ClaimsApp";

export const Route = createFileRoute("/claims")({
  component: ClaimsPage,
});

function ClaimsPage() {
  return <ClaimsApp />;
}
