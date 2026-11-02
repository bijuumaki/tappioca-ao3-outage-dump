import { expect, test } from "vitest";
import { statusOf } from "@/lib/admin/status";

const NOW = Date.parse("2026-11-03T12:00:00Z");
test("no date is a draft, a future date is scheduled, a past date is published", () => {
  expect(statusOf(null, NOW)).toBe("draft");
  expect(statusOf("2026-11-04T00:00:00Z", NOW)).toBe("scheduled");
  expect(statusOf("2026-11-02T00:00:00Z", NOW)).toBe("published");
});
test("a date exactly now counts as published", () => {
  expect(statusOf("2026-11-03T12:00:00Z", NOW)).toBe("published");
});
