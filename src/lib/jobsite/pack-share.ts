/**
 * Free multi-device handoff without cloud: clipboard + Web Share + download.
 */

import { packToJson } from "./pack";
import type { Jobsite } from "./types";

export async function copyPackToClipboard(jobsite: Jobsite): Promise<void> {
  const text = packToJson(jobsite);
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  // Fallback
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

export async function sharePackIfPossible(jobsite: Jobsite): Promise<"shared" | "copied" | "unavailable"> {
  const text = packToJson(jobsite);
  const filename = `${(jobsite.name || "jobsite").replace(/[^a-z0-9]+/gi, "-").slice(0, 40)}.lpin-jobsite.json`;
  try {
    if (navigator.share && navigator.canShare) {
      const file = new File([text], filename, { type: "application/json" });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `LPIN Suite Jobsite — ${jobsite.name}`,
          text: "Open project pack (device-local team board).",
        });
        return "shared";
      }
      await navigator.share({
        title: `LPIN Suite Jobsite — ${jobsite.name}`,
        text: text.slice(0, 4000),
      });
      return "shared";
    }
  } catch {
    /* user cancelled or share failed */
  }
  try {
    await copyPackToClipboard(jobsite);
    return "copied";
  } catch {
    return "unavailable";
  }
}
