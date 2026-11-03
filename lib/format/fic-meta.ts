import type { FicCardData } from "@/lib/content/queries";
import { RATING_LABELS } from "@/lib/content/types";
import { formatWords } from "./words";

export function fandomNames(fic: Pick<FicCardData, "tags">): string {
  return fic.tags.filter((t) => t.type === "fandom").map((t) => t.name).join(", ");
}
/* "Teen and Up · A/B, C/D" */
export function ratingAndRelationships(fic: Pick<FicCardData, "rating" | "tags">): string {
  const rel = fic.tags.filter((t) => t.type === "relationship").map((t) => t.name).join(", ");
  return [RATING_LABELS[fic.rating], rel].filter(Boolean).join(" · ");
}
/* "675 words · 3 of 10 chapters". No planned total: "?" while in progress, the posted count once complete. */
export function lengthLine(fic: Pick<FicCardData, "totalWords" | "chapterCount" | "planned_chapters" | "status">): string {
  const total = fic.planned_chapters ? Math.max(fic.planned_chapters, fic.chapterCount) : fic.status === "complete" ? fic.chapterCount : null;
  return `${formatWords(fic.totalWords)} · ${fic.chapterCount} of ${total ?? "?"} ${total === 1 ? "chapter" : "chapters"}`;
}
