import { createFileRoute } from "@tanstack/react-router";
import { JobsiteApp } from "@/components/jobsite/JobsiteApp";

export const Route = createFileRoute("/jobsite")({
  component: JobsitePage,
  head: () => ({
    meta: [
      {
        title: "Jobsite · LPIN Suite",
      },
      {
        name: "description",
        content:
          "LPIN Suite Jobsite — US field reports, building-department team lane, inspections, industry schedules, and materials. Open packs. Device-local.",
      },
    ],
  }),
});

function JobsitePage() {
  return <JobsiteApp />;
}
