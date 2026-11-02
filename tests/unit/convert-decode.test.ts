import { expect, test } from "vitest";
import { decodeText } from "@/lib/convert/decode";

test("UTF-8 is read as UTF-8", () => {
  expect(decodeText(new TextEncoder().encode("“hi” ñ").buffer as ArrayBuffer)).toBe("“hi” ñ");
});
test("an old Windows-1252 file (Word's Save as HTML) keeps its curly quotes", () => {
  expect(decodeText(new Uint8Array([0x93, 0x68, 0x69, 0x94]).buffer as ArrayBuffer)).toBe("“hi”");
});
test("a byte-order mark is removed", () => {
  expect(decodeText(new Uint8Array([0xef, 0xbb, 0xbf, 0x68, 0x69]).buffer as ArrayBuffer)).toBe("hi");
});

test("an uploaded Windows-1252 .html keeps its curly quotes all the way through", async () => {
  const { convertFile } = await import("@/lib/convert");
  const bytes = new Uint8Array([...new TextEncoder().encode("<p>"), 0x93, 0x68, 0x69, 0x94, ...new TextEncoder().encode("</p>")]);
  const out = await convertFile("old.html", bytes.buffer as ArrayBuffer, async () => "");
  expect(out.chapters[0].html).toBe("<p>“hi”</p>");
});
