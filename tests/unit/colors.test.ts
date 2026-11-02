import { expect, test } from "vitest";
import { adaptColor, contrastRatio, parseColor } from "@/lib/richtext/colors";
import { renderRichText } from "@/lib/richtext/render";

const LIGHT = "#f5f5f5";
const DARK = "#222831";

function hue(hex: string): number {
  const { r, g, b } = parseColor(hex)!;
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B), min = Math.min(R, G, B), d = max - min;
  if (d === 0) return 0;
  const h = max === R ? ((G - B) / d) % 6 : max === G ? (B - R) / d + 2 : (R - G) / d + 4;
  return (h * 60 + 360) % 360;
}

test("parses short hex, long hex and rgb()", () => {
  for (const c of ["#abc", "#aabbcc", "rgb(170, 187, 204)"]) expect(parseColor(c)).toEqual({ r: 170, g: 187, b: 204 });
});
test("parses named colors", () => expect(parseColor("red")).toEqual({ r: 255, g: 0, b: 0 }));
test("unknown color is null", () => expect(parseColor("banana")).toBeNull());
test("readable color is unchanged", () => expect(adaptColor("#8b3253", LIGHT)).toBe("#8b3253"));
test("dark mode lightens a dark color, same hue", () => {
  const out = adaptColor("#8b3253", DARK);
  expect(contrastRatio(out, DARK)).toBeGreaterThanOrEqual(4.5);
  expect(Math.abs(hue(out) - hue("#8b3253"))).toBeLessThan(2);
});
test("light mode darkens yellow until readable", () => expect(contrastRatio(adaptColor("#ffff00", LIGHT), LIGHT)).toBeGreaterThanOrEqual(4.5));
test("unknown colors are dropped when rendering", () => {
  const out = renderRichText('<p style="color:banana">a</p>');
  expect(out).not.toContain("style");
  expect(out).not.toContain("rt-c");
});
test("rendering turns a color into per-theme variables", () => {
  const out = renderRichText('<p style="color:#8b3253">a</p>');
  expect(out).toContain('class="rt-c"');
  expect(out).toContain("--c-l:#8b3253");
  expect(out).toMatch(/--c-d:#[0-9a-f]{6}/);
});
test("rendering keeps alignment next to colors", () => {
  const out = renderRichText('<p style="text-align:center;color:red">a</p>');
  expect(out).toContain("text-align:center");
  expect(out).toContain("--c-l:");
});

test("black from Docs or Word is treated as normal text color", () => {
  for (const c of ["#000000", "rgb(0, 0, 0)", "black", "#0e101a", "#111111"]) {
    const out = renderRichText(`<p><span style="color:${c}">a</span></p>`);
    expect(out, c).not.toContain("rt-c");
    expect(out, c).not.toContain("style");
  }
});
test("white text is treated as normal text color too", () => {
  expect(renderRichText('<p style="color:#ffffff">a</p>')).not.toContain("rt-c");
});
test("a real grey or a dark color is still kept", () => {
  expect(renderRichText('<p style="color:#808080">a</p>')).toContain("rt-c");
  expect(renderRichText('<p style="color:#8b3253">a</p>')).toContain("rt-c");
});

test("rendered colors are readable on every theme background", () => {
  for (const color of ["#8b3253", "#ffff00", "#3366cc", "#e0a36e"]) {
    const out = renderRichText(`<p style="color:${color}">a</p>`);
    const light = out.match(/--c-l:(#[0-9a-f]{6})/)![1];
    const dark = out.match(/--c-d:(#[0-9a-f]{6})/)![1];
    for (const bg of ["#EDF6F9", "#F6F1E7", "#FBF8F2"]) expect(contrastRatio(light, bg), `${color} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    for (const bg of ["#14262D", "#06141B", "#1B3540", "#11212D"]) expect(contrastRatio(dark, bg), `${color} on ${bg}`).toBeGreaterThanOrEqual(4.5);
  }
});
