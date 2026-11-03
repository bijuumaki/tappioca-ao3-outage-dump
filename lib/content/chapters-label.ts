import type { FicStatus } from "@/lib/content/types";

/* AO3-style "3/10". No planned total: "5/5" when complete, "3/?" while in progress. */
export function chaptersLabel(posted: number, planned: number | null, status: FicStatus): string {
  if (planned) return `${posted}/${Math.max(planned, posted)}`;
  return status === "complete" ? `${posted}/${posted}` : `${posted}/?`;
}
