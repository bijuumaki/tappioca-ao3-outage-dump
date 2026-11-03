import { describe, expect, it } from "vitest";
import { CODE_PATTERN, cleanMarks, makeCode, mergeMarks, normalizeCode, type Mark } from "@/lib/notes/model";
import { locate } from "@/lib/client/notes-dom";

const mark = (over: Partial<Mark> = {}): Mark => ({
  id: "abc123xy", slug: "a-story", n: 1, start: 4, end: 9, quote: "quick", color: "yellow", note: "", fic: "A story", ch: "Chapter 1", updated: 1000, ...over,
});

describe("highlight sync", () => {
  it("keeps the most recently changed copy of a highlight", () => {
    const merged = mergeMarks([mark({ note: "old", updated: 1000 })], [mark({ note: "new", updated: 2000 })]);
    expect(merged).toHaveLength(1);
    expect(merged[0].note).toBe("new");
  });
  it("brings in highlights from the other device", () => {
    expect(mergeMarks([mark()], [mark({ id: "zzzzzz11" })])).toHaveLength(2);
  });
  it("carries a delete to the other device", () => {
    const merged = mergeMarks([mark({ updated: 1000 })], [mark({ deleted: true, updated: 2000 })], 3000);
    expect(merged[0].deleted).toBe(true);
  });
  it("forgets deletions after 90 days", () => {
    const day = 24 * 60 * 60 * 1000;
    expect(mergeMarks([], [mark({ deleted: true, updated: 1000 })], 1000 + 91 * day)).toHaveLength(0);
  });
  it("drops malformed entries and trims long notes", () => {
    const out = cleanMarks([mark({ note: "x".repeat(5000) }), { id: "!!", slug: "a" }, null, "text", mark({ id: "bad", start: 5, end: 5 })]);
    expect(out).toHaveLength(1);
    expect(out[0].note).toHaveLength(2000);
  });
  it("makes codes in the expected shape, and reads them back from sloppy typing", () => {
    const code = makeCode((n) => Uint8Array.from({ length: n }, (_, i) => i * 7 + 3));
    expect(code).toMatch(CODE_PATTERN);
    expect(normalizeCode(code.toLowerCase().replaceAll("-", " "))).toBe(code);
    expect(CODE_PATTERN.test("short")).toBe(false);
  });
});

describe("finding a highlight again", () => {
  it("uses the saved place when the text still matches", () => {
    expect(locate("the quick fox", { start: 4, end: 9, quote: "quick" })).toEqual({ start: 4, end: 9 });
  });
  it("finds the quote when the text before it changed", () => {
    expect(locate("a very quick fox", { start: 4, end: 9, quote: "quick" })).toEqual({ start: 7, end: 12 });
  });
  it("gives up when the quote is gone", () => {
    expect(locate("the slow fox", { start: 4, end: 9, quote: "quick" })).toBeNull();
  });
});
