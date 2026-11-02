import { expect, test } from "vitest";
import { groupFiles, parseChapterFilename } from "@/lib/convert/names";

test("Title - N is chapter N", () => {
  expect(parseChapterFilename("MORIBUND - 1.md")).toEqual({ title: "MORIBUND", n: 1, ext: "md" });
  expect(parseChapterFilename("My Fic - 12.html")).toEqual({ title: "My Fic", n: 12, ext: "html" });
});
test("other names are one-chapter fics named from the file", () => {
  expect(parseChapterFilename("Anam_Cara.epub")).toEqual({ title: "Anam Cara", n: null, ext: "epub" });
  expect(parseChapterFilename("fic - 1234.md").n).toBeNull();
});
test("files of one fic group together in chapter order", () => {
  const groups = groupFiles(["B - 2.md", "A - 1.md", "B - 1.md", "Solo.epub"]);
  expect(groups.map((g) => [g.title, g.files.map((f) => f.name)])).toEqual([
    ["B", ["B - 1.md", "B - 2.md"]], ["A", ["A - 1.md"]], ["Solo", ["Solo.epub"]],
  ]);
});
