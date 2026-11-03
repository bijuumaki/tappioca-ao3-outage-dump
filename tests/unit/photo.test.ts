import { describe, expect, it } from "vitest";
import { parsePhoto, serializePhoto } from "@/lib/content/photo";

describe("site photo frame", () => {
  it("reads a plain path as the old form, centered and not zoomed", () => {
    expect(parsePhoto("site/photo-1.webp")).toEqual({ path: "site/photo-1.webp", zoom: 1, x: 50, y: 50 });
  });
  it("reads the saved form back", () => {
    const text = serializePhoto({ path: "site/a.png", zoom: 1.8, x: 30, y: 70 });
    expect(parsePhoto(text)).toEqual({ path: "site/a.png", zoom: 1.8, x: 30, y: 70 });
  });
  it("keeps zoom and position inside their limits", () => {
    expect(parsePhoto(serializePhoto({ path: "p", zoom: 9, x: -5, y: 400 }))).toEqual({ path: "p", zoom: 3, x: 0, y: 100 });
  });
  it("treats empty or broken text as no photo", () => {
    expect(parsePhoto("")).toBeNull();
    expect(parsePhoto(null)).toBeNull();
    expect(parsePhoto("{not json")).toBeNull();
    expect(parsePhoto('{"zoom":2}')).toBeNull();
  });
});
