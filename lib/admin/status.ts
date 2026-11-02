export type StoryStatus = "published" | "scheduled" | "draft";

/* The one rule for a story's or chapter's state: no date is a draft, a future date is scheduled, a past date is published. */
export function statusOf(publishAt: string | null, now = Date.now()): StoryStatus {
  if (!publishAt) return "draft";
  return Date.parse(publishAt) > now ? "scheduled" : "published";
}
