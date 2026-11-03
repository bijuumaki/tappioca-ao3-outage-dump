import { RATING_LABELS, type Rating } from "@/lib/content/types";

/* "Nothing goes public until the basics are there." One place for the rule, used by the admin dialog and by the publish action. */
export type Check = { key: "title" | "summary" | "rating" | "fandom"; label: string; ok: boolean; note: string };

function plainText(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/&nbsp;|&#160;/gi, " ").replace(/\s+/g, " ").trim();
}

export function storyChecks(d: { title: string; summaryHtml: string; rating: Rating; fandom: string }): Check[] {
  const title = d.title.trim();
  const summary = plainText(d.summaryHtml);
  const fandom = d.fandom.trim();
  const hasTitle = title !== "" && title !== "Untitled";
  const hasRating = d.rating !== "not_rated";
  return [
    { key: "title", label: "Story title", ok: hasTitle, note: hasTitle ? title : "Add a title above the chapter." },
    { key: "summary", label: "Summary", ok: summary !== "", note: summary !== "" ? summary : "Add a summary in story details." },
    { key: "rating", label: "Rating", ok: hasRating, note: hasRating ? RATING_LABELS[d.rating] : "Pick a rating. Not Rated can’t be published." },
    { key: "fandom", label: "Fandom", ok: fandom !== "", note: fandom !== "" ? fandom : "Add a fandom in story details." },
  ];
}

export function missingCount(checks: Check[]): number {
  return checks.filter((c) => !c.ok).length;
}

const TODO: Record<Check["key"], string> = { title: "add a title", summary: "add a summary", rating: "pick a rating", fandom: "add a fandom" };

/* "Before publishing: add a title, add a summary and pick a rating." or null when nothing is missing. */
export function publishBlockedMessage(checks: Check[]): string | null {
  const todo = checks.filter((c) => !c.ok).map((c) => TODO[c.key]);
  if (!todo.length) return null;
  const list = todo.length === 1 ? todo[0] : `${todo.slice(0, -1).join(", ")} and ${todo[todo.length - 1]}`;
  return `Before publishing: ${list}.`;
}
