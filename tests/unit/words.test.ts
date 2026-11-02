import { expect, test } from "vitest";
import { countWords } from "@/lib/text/words";

test("counts words across paragraphs", () => expect(countWords("<p>one two</p><p>three</p>")).toBe(3));
test("tags and entities are not words", () => expect(countWords("<p>a&nbsp;b</p>")).toBe(2));
test("hyphenated word counts once", () => expect(countWords("<p>well-known</p>")).toBe(1));
test("contraction counts once", () => expect(countWords("<p>don't</p>")).toBe(1));
test("empty text is zero", () => expect(countWords("")).toBe(0));
test("scene break is zero", () => expect(countWords("<hr>")).toBe(0));
test("words split by a line break count separately", () => expect(countWords("one<br>two")).toBe(2));
