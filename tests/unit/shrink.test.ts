import { expect, test } from "vitest";
import { targetSize } from "@/lib/client/shrink-image";

test("big photos are scaled down to 2400 pixels wide", () => {
  expect(targetSize(4000, 3000, 6_000_000)).toEqual({ width: 2400, height: 1800 });
});
test("small, light pictures are left alone", () => {
  expect(targetSize(800, 600, 300_000)).toBeNull();
});
test("heavy pictures within the width limit are re-saved smaller at the same size", () => {
  expect(targetSize(2000, 1500, 2_000_000)).toEqual({ width: 2000, height: 1500 });
});
test("tall pictures keep their shape", () => {
  expect(targetSize(3000, 6000, 1_000_000)).toEqual({ width: 2400, height: 4800 });
});
