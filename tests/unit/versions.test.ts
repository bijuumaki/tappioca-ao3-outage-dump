import { expect, test } from "vitest";
import { shouldSnapshot } from "@/lib/admin/versions";

const T = Date.parse("2026-11-03T12:00:00Z");
const ago = (min: number) => new Date(T - min * 60_000).toISOString();

test("autosave makes a version only when there is none or the last is 10+ minutes old", () => {
  expect(shouldSnapshot(null, T, "autosave")).toBe(true);
  expect(shouldSnapshot(ago(5), T, "autosave")).toBe(false);
  expect(shouldSnapshot(ago(10), T, "autosave")).toBe(true);
  expect(shouldSnapshot(ago(11), T, "autosave")).toBe(true);
});
test("publishing, replacing by upload and restoring always make a version", () => {
  for (const reason of ["publish", "upload", "restore"] as const) expect(shouldSnapshot(ago(0), T, reason)).toBe(true);
});
