import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { lastPlace, placeOf, recordPlace } from "@/lib/client/reading-memory";

function fakeStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => { data[k] = v; },
    data,
  };
}

describe("reading memory", () => {
  beforeEach(() => { vi.stubGlobal("localStorage", fakeStorage()); });
  afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

  it("remembers the chapter a story was left at", () => {
    recordPlace("anam-cara", { n: 3, title: "Anam Cara", count: 25 });
    expect(placeOf("anam-cara")).toMatchObject({ n: 3, title: "Anam Cara", count: 25 });
    expect(placeOf("other")).toBeNull();
  });

  it("lastPlace is the story read most recently", () => {
    vi.useFakeTimers();
    vi.setSystemTime(1000);
    recordPlace("a", { n: 1, title: "A", count: 2 });
    vi.setSystemTime(2000);
    recordPlace("b", { n: 4, title: "B", count: 9 });
    expect(lastPlace()).toMatchObject({ slug: "b", n: 4 });
    vi.setSystemTime(3000);
    recordPlace("a", { n: 2, title: "A", count: 2 });
    expect(lastPlace()).toMatchObject({ slug: "a", n: 2 });
  });

  it("survives corrupt saved data", () => {
    vi.stubGlobal("localStorage", fakeStorage({ "fic-site-place": "{nope" }));
    expect(placeOf("a")).toBeNull();
    expect(lastPlace()).toBeNull();
    expect(() => { recordPlace("a", { n: 1, title: "A", count: 1 }); }).not.toThrow();
  });

  it("survives storage that throws", () => {
    const boom = { getItem: () => { throw new Error("blocked"); }, setItem: () => { throw new Error("blocked"); } };
    vi.stubGlobal("localStorage", boom);
    expect(placeOf("a")).toBeNull();
    expect(lastPlace()).toBeNull();
    expect(() => { recordPlace("a", { n: 1, title: "A", count: 1 }); }).not.toThrow();
  });
});
