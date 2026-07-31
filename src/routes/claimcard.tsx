import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/claimcard")({
  beforeLoad: () => {
    throw redirect({ to: "/claims" });
  },
});
