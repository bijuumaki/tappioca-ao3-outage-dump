import { describe, expect, test } from "vitest";
import { createReaderClient } from "@/lib/supabase/server";

const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe.skipIf(!configured)("what readers can see", () => {
  test("draft fic is not returned", async () => {
    const { data } = await createReaderClient().from("fics").select("slug").eq("slug", "sample-draft");
    expect(data).toEqual([]);
  });

  test("scheduled chapter is hidden; visible positions are 1, 2, 4", async () => {
    const db = createReaderClient();
    const { data: fic } = await db.from("fics").select("id").eq("slug", "sample-fic").single();
    expect(fic).not.toBeNull();
    const { data } = await db.from("chapters").select("position").eq("fic_id", fic!.id).order("position");
    expect(data!.map((c) => c.position)).toEqual([1, 2, 4]);
  });

  test("chapters of a draft fic are hidden even when their own time has passed", async () => {
    const { data } = await createReaderClient().from("chapters").select("id, fics!inner(slug)").eq("fics.slug", "sample-draft");
    expect(data).toEqual([]);
  });

  test("the public key cannot add fics", async () => {
    const { error } = await createReaderClient().from("fics").insert({ slug: "intruder", title: "x", category_id: 1 });
    expect(error).not.toBeNull();
  });
});

describe.skipIf(!configured)("reader queries", async () => {
  const q = await import("@/lib/content/queries");

  test("getFic numbers visible chapters 1..3 and totals their words", async () => {
    const fic = await q.getFic("sample-fic");
    expect(fic!.chapters.map((c) => c.n)).toEqual([1, 2, 3]);
    expect(fic!.totalWords).toBe(fic!.chapters.reduce((s, c) => s + c.word_count, 0));
    expect(fic!.totalWords).toBe(10 + 660 + 5);
  });

  test("getChapter past the last visible chapter is null", async () => {
    expect(await q.getChapter("sample-fic", 4)).toBeNull();
    expect((await q.getChapter("sample-fic", 3))!.chapter.position).toBe(4);
  });

  test("getChapter rejects zero and non-integers", async () => {
    expect(await q.getChapter("sample-fic", 0)).toBeNull();
    expect(await q.getChapter("sample-fic", 1.5)).toBeNull();
  });

  test("getFic of a draft is null", async () => {
    expect(await q.getFic("sample-draft")).toBeNull();
  });

  test("browse filters by category and sorts by length", async () => {
    const art = await q.browse({ category: "art" });
    expect(art.fics).toEqual([]);
    expect(art.posts.map((p) => p.slug)).toEqual(["sample-art"]);
    const longest = await q.browse({ sort: "longest" });
    const words = longest.fics.map((f) => f.totalWords);
    expect(words).toEqual([...words].sort((a, b) => b - a));
  });

  test("getTagItems lists fics and posts with that tag", async () => {
    const res = await q.getTagItems("fandom", "sample-fandom");
    expect(res!.fics.map((f) => f.slug).sort()).toEqual(["sample-fic", "sample-mature", "sample-oneshot"]);
    expect(res!.posts.map((p) => p.slug)).toEqual(["sample-art"]);
  });

  test("getPage only knows the four simple pages", async () => {
    expect((await q.getPage("about"))!.title).toBe("About");
    expect(await q.getPage("nonsense")).toBeNull();
  });
});

describe.skipIf(!configured)("tags", () => {
  test("a tag used only by a draft fic is hidden from readers", async () => {
    const { data } = await createReaderClient().from("tags").select("slug").eq("slug", "draft-only-tag");
    expect(data).toEqual([]);
  });

  test("a tag used by a published fic is visible", async () => {
    const { data } = await createReaderClient().from("tags").select("slug").eq("slug", "sample-fandom");
    expect(data).toEqual([{ slug: "sample-fandom" }]);
  });
});
