import { expect, test } from "vitest";
import { parseTagInput, plannedFromText, RATING_OPTIONS, storyDetailsFromForm, uniqueSlug } from "@/lib/admin/story-form";
import { chaptersLabel } from "@/lib/content/chapters-label";
import { RATING_LABELS } from "@/lib/content/types";

test("tag input splits on commas, trims, drops empties and case-duplicates", () => {
  expect(parseTagInput("Ashley/Leon, , ashley/leon ,Hurt/Comfort")).toEqual(["Ashley/Leon", "Hurt/Comfort"]);
  expect(parseTagInput("")).toEqual([]);
});

test("unique slugs count up", () => {
  expect(uniqueSlug("anam-cara", [])).toBe("anam-cara");
  expect(uniqueSlug("anam-cara", ["anam-cara"])).toBe("anam-cara-2");
  expect(uniqueSlug("anam-cara", ["anam-cara", "anam-cara-2"])).toBe("anam-cara-3");
});

function form(entries: Record<string, string>): FormData {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.set(k, v);
  return f;
}

test("story details come from the form", () => {
  const d = storyDetailsFromForm(form({
    title: "  (e2e story) ", summary: "(summary)", rating: "teen", fandom: " (fandom) ",
    relationships: "(a)/(b), (c)/(d)", characters: "(a)", warnings: "", tags: "(tag)",
  }));
  expect(d).toEqual({
    title: "(e2e story)", summary: "(summary)", rating: "teen", fandom: "(fandom)",
    relationships: ["(a)/(b)", "(c)/(d)"], characters: ["(a)"], warnings: [], tags: ["(tag)"],
    status: "in_progress", planned: null,
  });
});

test("unknown rating becomes Not Rated and an empty title becomes Untitled", () => {
  const d = storyDetailsFromForm(form({ title: "  ", rating: "spicy" }));
  expect(d.rating).toBe("not_rated");
  expect(d.title).toBe("Untitled");
});

test("status and planned chapters come from the form", () => {
  expect(storyDetailsFromForm(form({ status: "complete", planned: " 10 " }))).toMatchObject({ status: "complete", planned: 10 });
  expect(storyDetailsFromForm(form({ status: "nope", planned: "0" }))).toMatchObject({ status: "in_progress", planned: null });
  expect(plannedFromText("2.5")).toBeNull();
  expect(plannedFromText("")).toBeNull();
});

test("chapters label reads like AO3", () => {
  expect(chaptersLabel(3, 10, "in_progress")).toBe("3/10");
  expect(chaptersLabel(3, null, "in_progress")).toBe("3/?");
  expect(chaptersLabel(5, null, "complete")).toBe("5/5");
  expect(chaptersLabel(12, 10, "in_progress")).toBe("12/12");
});

test("rating options are in AO3 order with the canvas wording", () => {
  expect(RATING_OPTIONS.map((o) => o.label)).toEqual(["Not Rated", "General Audiences", "Teen and Up", "Mature", "Explicit"]);
  expect(RATING_LABELS.teen).toBe("Teen and Up");
});
