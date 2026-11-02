import { expect, test } from "vitest";
import { sanitizeRichText } from "@/lib/richtext/allowlist";

test("scripts are removed", () => expect(sanitizeRichText("<script>alert(1)</script><p>x</p>")).toBe("<p>x</p>"));
test("event handlers are removed", () => expect(sanitizeRichText('<p onclick="x()">a</p>')).toBe("<p>a</p>"));
test("javascript links lose their href", () => expect(sanitizeRichText('<a href="javascript:alert(1)">a</a>')).not.toContain("javascript"));
test("only color survives from mixed styles", () => {
  const out = sanitizeRichText('<p style="position:fixed;color:red">a</p>');
  expect(out).toContain("color:red");
  expect(out).not.toContain("position");
});
test("alignment is kept", () => expect(sanitizeRichText('<p style="text-align:center">a</p>')).toBe('<p style="text-align:center">a</p>'));
test("h1 becomes h2", () => expect(sanitizeRichText("<h1>T</h1>")).toBe("<h2>T</h2>"));
test("images keep src and alt only", () => {
  expect(sanitizeRichText('<img src="https://x/y.png" alt="a" onerror="x">')).toBe('<img src="https://x/y.png" alt="a" />');
});
test("font tags are unwrapped", () => expect(sanitizeRichText('<font face="Arial">a</font>')).toBe("a"));
test("highlight is kept", () => expect(sanitizeRichText('<span style="background-color:#ff0">a</span>')).toBe('<span style="background-color:#ff0">a</span>'));
test("b and i become strong and em", () => expect(sanitizeRichText("<b>a</b><i>b</i>")).toBe("<strong>a</strong><em>b</em>"));
