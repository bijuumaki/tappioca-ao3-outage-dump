import { expect, test } from "vitest";
import { htmlToChapter } from "@/lib/convert/html";

test("a Google Docs paste keeps bold and italic and drops the wrapper", () => {
  const out = htmlToChapter('<b style="font-weight:normal" id="docs-internal-guid-x"><p dir="ltr"><span style="font-weight:700;font-style:italic">Hi</span> there</p></b>');
  expect(out).toContain("<strong><em>Hi</em></strong>");
  expect(out).toContain("there");
  expect(out).not.toContain("docs-internal");
  expect(out).not.toMatch(/^<strong>/);
});

test("underline and strikethrough styles become tags", () => {
  const out = htmlToChapter('<p><span style="text-decoration:underline">u</span><span style="text-decoration:line-through">s</span></p>');
  expect(out).toContain("<u>u</u>");
  expect(out).toContain("<s>s</s>");
});

test("color, highlight and alignment are kept", () => {
  const out = htmlToChapter('<p style="text-align:center;color:#8b3253">a</p><p><span style="background-color:#ff0">b</span></p>');
  expect(out).toContain("text-align:center");
  expect(out).toContain("color:#8b3253");
  expect(out).toContain("background-color:#ff0");
});

test("scripts, handlers, unsafe links and fonts are removed", () => {
  const out = htmlToChapter('<p onclick="x()">a</p><script>alert(1)</script><a href="javascript:alert(1)">l</a><span style="font-family:Arial">f</span>');
  expect(out).not.toContain("script");
  expect(out).not.toContain("onclick");
  expect(out).not.toContain("javascript");
  expect(out).not.toContain("font-family");
  expect(out).toContain("f");
});

test("a whole document is reduced to its body", () => {
  const out = htmlToChapter("<!doctype html><html><head><title>T</title><style>p{}</style></head><body><p>x</p></body></html>");
  expect(out).toBe("<p>x</p>");
});

test("headings, quotes, lists, scene breaks and line breaks survive", () => {
  const out = htmlToChapter("<h1>Big</h1><blockquote><p>q</p></blockquote><ul><li>a</li></ul><hr><p>l1<br>l2</p>");
  expect(out).toContain("<h2>Big</h2>");
  expect(out).toContain("<blockquote>");
  expect(out).toContain("<li>a</li>");
  expect(out).toContain("<hr");
  expect(out).toContain("l1<br />l2");
});

test("empty input gives empty output", () => {
  expect(htmlToChapter("")).toBe("");
});

test("the black text and transparent background Google Docs puts on everything are dropped", () => {
  const out = htmlToChapter('<p><span style="color:#000000;background-color:transparent;font-weight:400">x</span></p>');
  expect(out).toBe("<p>x</p>");
});
test("a real color survives; neutral defaults and white backgrounds don't", () => {
  const out = htmlToChapter('<p><span style="color:#8b3253">a</span><span style="color:inherit;background-color:#ffffff">b</span><span style="background-color:rgba(0,0,0,0)">c</span></p>');
  expect(out).toContain("color:#8b3253");
  expect(out).toContain("<span") ;
  expect(out).not.toContain("#ffffff");
  expect(out).not.toContain("inherit");
  expect(out).not.toContain("rgba");
});
test("absurdly deep nesting doesn't crash", () => {
  expect(htmlToChapter("<div>".repeat(30000) + "deep text")).toContain("deep text");
});
