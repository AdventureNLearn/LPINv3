import { createFileRoute } from "@tanstack/react-router";
import { MobileJobsiteShell } from "@/editions/mobile/MobileJobsiteShell";

export const Route = createFileRoute("/jobsite")({
  component: JobsitePage,
});

function JobsitePage() {
  return <MobileJobsiteShell />;
}
