import { describe, expect, it, vi } from "vitest";
import { deleteStoriesCore } from "@/lib/admin/delete-stories";

function fakeDb(rows: { id: number }[]) {
  const inFn = vi.fn(() => ({ select: () => Promise.resolve({ data: rows, error: null }) }));
  return { db: { from: () => ({ delete: () => ({ in: inFn }) }) } as never, inFn };
}

describe("deleteStoriesCore", () => {
  it("refuses an empty or invalid pick", async () => {
    const { db, inFn } = fakeDb([]);
    for (const ids of [[], [0], [-3], [1.5]]) expect((await deleteStoriesCore(db, ids)).ok).toBe(false);
    expect(inFn).not.toHaveBeenCalled();
  });
  it("deletes the chosen stories and reports how many went", async () => {
    const { db, inFn } = fakeDb([{ id: 4 }, { id: 9 }]);
    expect(await deleteStoriesCore(db, [4, 9])).toEqual({ ok: true, count: 2 });
    expect(inFn).toHaveBeenCalledWith("id", [4, 9]);
  });
});
