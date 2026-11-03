import { RATING_LABELS, STATUS_LABELS, type FicStatus, type Rating } from "@/lib/content/types";

export const RATING_OPTIONS: { value: Rating; label: string }[] = (["not_rated", "general", "teen", "mature", "explicit"] as Rating[])
  .map((value) => ({ value, label: RATING_LABELS[value] }));

/* "A/B, , a/b ,C" -> ["A/B", "C"]: comma-separated, trimmed, no empties, no case-duplicates (first spelling wins). */
export function parseTagInput(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of text.split(",")) {
    const name = raw.trim().replace(/\s+/g, " ");
    if (!name || seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    out.push(name);
  }
  return out;
}

/* base, base-2, base-3 … skipping any already taken. */
export function uniqueSlug(base: string, taken: string[]): string {
  const used = new Set(taken);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

export type StoryDetails = {
  title: string; summary: string; rating: Rating; fandom: string;
  relationships: string[]; characters: string[]; warnings: string[]; tags: string[];
  status: FicStatus; planned: number | null;
};

/* "10" -> 10; blank, 0, junk or over 999 -> null (shown to readers as "?"). */
export function plannedFromText(text: string): number | null {
  const n = Number(text.trim());
  return text.trim() && Number.isInteger(n) && n >= 1 && n <= 999 ? n : null;
}

export function storyDetailsFromForm(form: FormData): StoryDetails {
  const text = (k: string) => String(form.get(k) ?? "").trim();
  const rating = text("rating");
  const status = text("status");
  return {
    title: text("title") || "Untitled",
    summary: text("summary"),
    rating: rating in RATING_LABELS ? (rating as Rating) : "not_rated",
    fandom: text("fandom").replace(/\s+/g, " "),
    relationships: parseTagInput(text("relationships")),
    characters: parseTagInput(text("characters")),
    warnings: parseTagInput(text("warnings")),
    tags: parseTagInput(text("tags")),
    status: status in STATUS_LABELS ? (status as FicStatus) : "in_progress",
    planned: plannedFromText(text("planned")),
  };
}

/* "teen", "Teen and Up", "General Audiences", "not rated"… to a rating; anything else is undefined. */
export function ratingFromText(text: string | undefined): Rating | undefined {
  const t = (text ?? "").trim().toLowerCase().replace(/_/g, " ");
  if (!t) return undefined;
  for (const [value, label] of Object.entries(RATING_LABELS)) {
    if (t === label.toLowerCase() || t === value.replace(/_/g, " ")) return value as Rating;
  }
  return undefined;
}
