import { expect, test } from "vitest";
import { markdownToChapter } from "@/lib/convert/markdown";
import { textToChapter } from "@/lib/convert/text";

test("markdown emphasis becomes em and strong", () => {
  expect(markdownToChapter("*a* **b**").html).toContain("<em>a</em> <strong>b</strong>");
});

test("front matter goes to meta, not the text", () => {
  const { html, meta } = markdownToChapter("---\ntitle: (e2e)\nfandom: (f)\nrating: teen\n---\n\nHello");
  expect(meta).toMatchObject({ title: "(e2e)", fandom: "(f)", rating: "teen" });
  expect(html).toContain("Hello");
  expect(html).not.toContain("title:");
});

test("lines of only ornaments or dashes become scene breaks", () => {
  const out = markdownToChapter("one\n\n⁂ ⁂ ⁂\n\ntwo\n\n---\n\nthree\n\n* * *\n\nfour").html;
  expect(out.match(/<hr/g)?.length).toBe(3);
});

test("raw scripts in markdown are removed", () => {
  expect(markdownToChapter("hi <script>alert(1)</script>").html).not.toContain("script");
});

test("plain text: blank lines make paragraphs, line breaks stay, symbols are text", () => {
  expect(textToChapter("a & b\nc\n\nd")).toBe("<p>a &amp; b<br />c</p><p>d</p>");
});
