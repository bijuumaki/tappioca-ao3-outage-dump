import { expect, test } from "vitest";
import { htmlToNotes, notesToHtml } from "@/lib/admin/notes";

test("plain notes become paragraphs and line breaks, with symbols kept as text", () => {
  expect(notesToHtml("Tom & Jerry <3\nsecond line\n\nnew paragraph")).toBe("<p>Tom &amp; Jerry &lt;3<br />second line</p><p>new paragraph</p>");
});
test("typed tags stay text, not markup", () => {
  expect(notesToHtml("<em>x</em>")).toBe("<p>&lt;em&gt;x&lt;/em&gt;</p>");
});
test("empty notes stay empty", () => {
  expect(notesToHtml("  \n ")).toBe("");
});
test("stored notes come back to the same plain text", () => {
  const text = "Tom & Jerry <3\nsecond line\n\nnew paragraph";
  expect(htmlToNotes(notesToHtml(text))).toBe(text);
});
test("older rich notes come back as readable text", () => {
  expect(htmlToNotes("<p>(notes <em>before</em>)</p>")).toBe("(notes before)");
});
