import { expect, test } from "vitest";
import { checkUploadRequest } from "@/lib/admin/upload-rules";

const MB = 1024 * 1024;
test("accepted types and sizes pass", () => {
  expect(checkUploadRequest([{ name: "a.md", size: 10 }, { name: "B - 2.EPUB", size: 20 * MB }])).toEqual([]);
});
test("other types, empty files and giant files are refused with a reason each", () => {
  const problems = checkUploadRequest([{ name: "run.exe", size: 5 }, { name: "empty.md", size: 0 }, { name: "huge.epub", size: 30 * MB }, { name: "noext", size: 5 }]);
  expect(problems.map((p) => p.name)).toEqual(["run.exe", "empty.md", "huge.epub", "noext"]);
  expect(problems[0].message).toMatch(/isn’t a type/);
  expect(problems[1].message).toMatch(/empty/i);
  expect(problems[2].message).toMatch(/25 MB/);
});
test("too many files at once are refused", () => {
  const many = Array.from({ length: 41 }, (_, i) => ({ name: `f - ${i + 1}.md`, size: 5 }));
  expect(checkUploadRequest(many).length).toBeGreaterThan(0);
});
