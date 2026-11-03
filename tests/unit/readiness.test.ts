import { describe, expect, it } from "vitest";
import { missingCount, publishBlockedMessage, storyChecks } from "@/lib/admin/readiness";

const complete = { title: "A Title", summaryHtml: "<p>A summary.</p>", rating: "teen" as const, fandom: "A Fandom" };
const byKey = (d: Parameters<typeof storyChecks>[0]) => Object.fromEntries(storyChecks(d).map((c) => [c.key, c]));

describe("storyChecks", () => {
  it("passes a complete story, in the canvas order, with the values as notes", () => {
    const checks = storyChecks(complete);
    expect(checks.map((c) => c.label)).toEqual(["Story title", "Summary", "Rating", "Fandom"]);
    expect(checks.every((c) => c.ok)).toBe(true);
    expect(checks.map((c) => c.note)).toEqual(["A Title", "A summary.", "Teen and Up", "A Fandom"]);
  });

  it("treats a blank title and the default 'Untitled' as missing", () => {
    expect(byKey({ ...complete, title: "   " }).title.ok).toBe(false);
    expect(byKey({ ...complete, title: "Untitled" }).title.ok).toBe(false);
    expect(byKey({ ...complete, title: "Untitled" }).title.note).toBe("Add a title above the chapter.");
  });

  it("treats a summary with no words in it as missing", () => {
    for (const summaryHtml of ["", "<p></p>", "<p>&nbsp;</p>", "<p> <br> </p>"]) {
      expect(byKey({ ...complete, summaryHtml }).summary.ok).toBe(false);
    }
    expect(byKey({ ...complete, summaryHtml: "<p>Hi</p>" }).summary.ok).toBe(true);
    expect(byKey({ ...complete, summaryHtml: "" }).summary.note).toBe("Add a summary in story details.");
  });

  it("refuses Not Rated", () => {
    const r = byKey({ ...complete, rating: "not_rated" }).rating;
    expect(r.ok).toBe(false);
    expect(r.note).toBe("Pick a rating. Not Rated can’t be published.");
  });

  it("needs a fandom", () => {
    expect(byKey({ ...complete, fandom: " " }).fandom.ok).toBe(false);
    expect(byKey({ ...complete, fandom: "" }).fandom.note).toBe("Add a fandom in story details.");
  });
});

describe("missingCount and publishBlockedMessage", () => {
  it("is quiet when everything is there", () => {
    expect(missingCount(storyChecks(complete))).toBe(0);
    expect(publishBlockedMessage(storyChecks(complete))).toBeNull();
  });
  it("names one missing thing", () => {
    const checks = storyChecks({ ...complete, summaryHtml: "" });
    expect(missingCount(checks)).toBe(1);
    expect(publishBlockedMessage(checks)).toBe("Before publishing: add a summary.");
  });
  it("names two and three missing things in a sentence", () => {
    expect(publishBlockedMessage(storyChecks({ ...complete, summaryHtml: "", rating: "not_rated" })))
      .toBe("Before publishing: add a summary and pick a rating.");
    expect(publishBlockedMessage(storyChecks({ title: "Untitled", summaryHtml: "", rating: "not_rated", fandom: "F" })))
      .toBe("Before publishing: add a title, add a summary and pick a rating.");
  });
});
