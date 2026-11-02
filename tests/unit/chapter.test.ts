import { expect, test } from "vitest";
import { prepareChapter } from "@/lib/admin/chapter";

test("a Google Docs paste is cleaned and counted", () => {
  const docs = '<b style="font-weight:normal" id="docs-internal-guid-x"><p dir="ltr"><span style="font-family:Arial;color:#000000;font-weight:700">Hi</span> <span style="font-style:italic">there</span></p></b><script>x</script>';
  const out = prepareChapter(docs);
  expect(out.body).not.toContain("script");
  expect(out.body).not.toContain("font-family");
  expect(out.body).not.toContain("docs-internal");
  expect(out.word_count).toBe(2);
});

test("alignment and color are kept", () => {
  const out = prepareChapter('<p style="text-align:center;color:#8b3253">a b c</p>');
  expect(out.body).toContain("text-align:center");
  expect(out.body).toContain("color:#8b3253");
  expect(out.word_count).toBe(3);
});

test("an empty editor counts zero words", () => {
  expect(prepareChapter("<p></p>").word_count).toBe(0);
});
