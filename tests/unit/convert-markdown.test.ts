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

test("a long line of non-English text with two symbols isn't slow", () => {
  const cjk = "漢".repeat(2000) + "·" + "漢".repeat(2000) + "·" + "漢".repeat(10);
  const t = Date.now();
  expect(markdownToChapter(cjk).html).toContain("漢");
  expect(Date.now() - t).toBeLessThan(500);
  const dashes = "-a".repeat(5000);
  const t2 = Date.now();
  markdownToChapter(dashes);
  expect(Date.now() - t2).toBeLessThan(500);
});

test("a picture inside a markdown file survives as a data address for the uploader to store", async () => {
  const { convertFile } = await import("@/lib/convert");
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgGAWjgAEAAAEAAbhoEZYAAAAASUVORK5CYII=", "base64");
  const md = `pic ![alt $& text](data:image/png;base64,${png.toString("base64")})`;
  const out = await convertFile("a.md", new TextEncoder().encode(md).buffer as ArrayBuffer, async () => "https://cdn.example/stored.png");
  expect(out.chapters[0].html).toContain('src="https://cdn.example/stored.png"');
  expect(out.chapters[0].html).toContain("alt $&amp; text");
});
