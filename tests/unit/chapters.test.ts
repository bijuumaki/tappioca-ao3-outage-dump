import { expect, test } from "vitest";
import { numberVisibleChapters } from "@/lib/content/chapters";

test("gaps close up", () => {
  expect(numberVisibleChapters([{ position: 1 }, { position: 2 }, { position: 4 }]).map((c) => c.n)).toEqual([1, 2, 3]);
});
test("unsorted input comes back in order", () => {
  const out = numberVisibleChapters([{ position: 4 }, { position: 1 }, { position: 2 }]);
  expect(out.map((c) => c.position)).toEqual([1, 2, 4]);
  expect(out.map((c) => c.n)).toEqual([1, 2, 3]);
});
test("empty stays empty", () => expect(numberVisibleChapters([])).toEqual([]));
