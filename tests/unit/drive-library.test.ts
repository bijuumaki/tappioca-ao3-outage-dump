import { describe, expect, it } from "vitest";
import { summarizeLibrary } from "@/lib/drive/library";

const f = (path: string, size = 100) => ({ path, name: path.split("/").pop() as string, size });

describe("drive library summary", () => {
  it("groups Title - N files into one fic and checks the numbers", () => {
    const r = summarizeLibrary([f("Naruto/Fic - 1.md"), f("Naruto/Fic - 2.md"), f("Naruto/Fic - 3.md")]);
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ title: "Fic", folder: "Naruto", ready: true, note: "All 3 chapters found, in order." });
  });
  it("flags a missing chapter, a repeat, an unreadable type and a big file", () => {
    expect(summarizeLibrary([f("A/T - 1.md"), f("A/T - 3.md")])[0]).toMatchObject({ ready: false, note: "Chapter 2 not found." });
    expect(summarizeLibrary([f("A/T - 1.md"), f("A/T - 1.txt")])[0].note).toBe("Chapter 1 appears more than once.");
    expect(summarizeLibrary([f("A/story.pdf")])[0].ready).toBe(false);
    expect(summarizeLibrary([f("A/big.epub", 26 * 1024 * 1024)])[0].note).toBe("big.epub is over 25 MB.");
  });
  it("treats a lone file as readable", () => {
    expect(summarizeLibrary([f("Unsorted/note.txt")])[0]).toMatchObject({ ready: true, note: "Readable." });
  });
});
