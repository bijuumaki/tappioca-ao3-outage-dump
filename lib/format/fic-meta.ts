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
/* "675 words · 3 chapters" */
export function lengthLine(fic: Pick<FicCardData, "totalWords" | "chapterCount">): string {
  return `${formatWords(fic.totalWords)} · ${fic.chapterCount === 1 ? "1 chapter" : `${fic.chapterCount} chapters`}`;
}
