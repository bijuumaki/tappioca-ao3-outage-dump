import { describe, expect, it } from "vitest";
import { latestActivity } from "@/lib/content/activity";

const fic = (slug: string, title: string, dates: (string | null)[]) => ({ slug, title, chapters: dates.map((publish_at, i) => ({ n: i + 1, publish_at })) });

describe("latestActivity", () => {
  it("lists the newest chapters first, three by default", () => {
    const out = latestActivity([
      fic("a", "A", ["2026-01-01T00:00:00Z", "2026-03-01T00:00:00Z"]),
      fic("b", "B", ["2026-02-01T00:00:00Z", "2026-04-01T00:00:00Z"]),
    ]);
    expect(out.map((x) => `${x.slug}${x.n}`)).toEqual(["b2", "a2", "b1"]);
  });
  it("calls a first chapter a new story and later ones a new chapter", () => {
    const out = latestActivity([fic("a", "A", ["2026-01-01T00:00:00Z", "2026-02-01T00:00:00Z"])]);
    expect(out.map((x) => x.kind)).toEqual(["chapter", "story"]);
  });
  it("skips chapters without a date and copes with no stories", () => {
    expect(latestActivity([fic("a", "A", [null])])).toEqual([]);
    expect(latestActivity([])).toEqual([]);
  });
});
