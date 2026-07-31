import { createFileRoute, redirect } from "@tanstack/react-router";

/** Legacy path — Fieldpulse product name retired. Always land on Jobsite. */
export const Route = createFileRoute("/fieldpulse")({
  beforeLoad: () => {
    throw redirect({ to: "/jobsite" });
  },
});
