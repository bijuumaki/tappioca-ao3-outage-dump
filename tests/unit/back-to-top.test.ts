import { describe, expect, it } from "vitest";
import { nextUpMode, shouldShowTop } from "@/lib/client/back-to-top";

const tall = { vh: 800, docHeight: 6000 };

describe("shouldShowTop", () => {
  it("is hidden at the top of a tall page", () => {
    expect(shouldShowTop({ ...tall, width: 1280, y: 0, upMode: false })).toBe(false);
  });
  it("shows within 200px of the bottom", () => {
    expect(shouldShowTop({ ...tall, width: 1280, y: 5000, upMode: false })).toBe(true);
    expect(shouldShowTop({ ...tall, width: 1280, y: 4999, upMode: false })).toBe(false);
  });
  it("on a phone also shows while scrolling back up", () => {
    expect(shouldShowTop({ ...tall, width: 390, y: 3000, upMode: true })).toBe(true);
  });
  it("on a wide screen scrolling up alone does not show it", () => {
    expect(shouldShowTop({ ...tall, width: 1280, y: 3000, upMode: true })).toBe(false);
  });
});

describe("nextUpMode", () => {
  it("turns on when scrolling up by 8px or more far from the top", () => {
    expect(nextUpMode({ prev: false, moved: -8, y: 2000, vh: 800 })).toBe(true);
  });
  it("turns off when scrolling down", () => {
    expect(nextUpMode({ prev: true, moved: 12, y: 2000, vh: 800 })).toBe(false);
  });
  it("turns off near the top (within 1.5 screens)", () => {
    expect(nextUpMode({ prev: true, moved: -20, y: 1000, vh: 800 })).toBe(false);
  });
  it("ignores tiny movements", () => {
    expect(nextUpMode({ prev: true, moved: -3, y: 2000, vh: 800 })).toBe(true);
    expect(nextUpMode({ prev: false, moved: -3, y: 2000, vh: 800 })).toBe(false);
  });
});
