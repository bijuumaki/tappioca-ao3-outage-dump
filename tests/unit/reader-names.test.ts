import { describe, expect, it } from "vitest";
import { readerName } from "@/lib/notes/names";

describe("anonymous reader names", () => {
  it("gives the same name to the same reader and different names to different readers", () => {
    const a = "a3f9c2d1e87b0456a3f9c2d1e87b0456";
    expect(readerName(a)).toBe(readerName(a));
    expect(readerName(a)).toMatch(/^[a-z]+ [a-z]+ \d\d$/);
    expect(readerName("00".repeat(16))).not.toBe(readerName("ff".repeat(16)));
  });
});
