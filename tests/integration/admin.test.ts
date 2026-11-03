import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createReaderClient } from "@/lib/supabase/server";
import { ensureAdmin, ensureUser, hasSecret, signedInClient, TEST_ADMIN, TEST_READER } from "../support/supabase-admin";

describe.skipIf(!hasSecret())("admin rules", () => {
  beforeAll(async () => {
    await ensureAdmin(TEST_ADMIN.email, TEST_ADMIN.password);
    await ensureUser(TEST_READER.email, TEST_READER.password);
  });

  test("the admin can read a draft", async () => {
    const db = await signedInClient(TEST_ADMIN.email, TEST_ADMIN.password);
    const { data } = await db.from("fics").select("slug").eq("slug", "sample-draft");
    expect(data).toEqual([{ slug: "sample-draft" }]);
  });

  test("the admin can add and remove a fic", async () => {
    const db = await signedInClient(TEST_ADMIN.email, TEST_ADMIN.password);
    const { data, error } = await db.from("fics").insert({ slug: "e2e-rule-check", title: "(e2e)", category_id: 1 }).select("id").single();
    expect(error).toBeNull();
    const del = await db.from("fics").delete().eq("id", data!.id);
    expect(del.error).toBeNull();
  });

  test("a signed-in non-admin can't add fics or read drafts", async () => {
    const db = await signedInClient(TEST_READER.email, TEST_READER.password);
    const ins = await db.from("fics").insert({ slug: "e2e-intruder", title: "x", category_id: 1 });
    expect(ins.error).not.toBeNull();
    const { data } = await db.from("fics").select("slug").eq("slug", "sample-draft");
    expect(data).toEqual([]);
  });

  test("the public key can't see the admins list or drafts", async () => {
    const reader = createReaderClient();
    const { data: admins } = await reader.from("admins").select("*");
    expect(admins ?? []).toEqual([]);
    const { data } = await reader.from("fics").select("slug").eq("slug", "sample-draft");
    expect(data).toEqual([]);
  });
});

describe.skipIf(!hasSecret())("publishing", async () => {
  const { publishChapterAt, unpublishChapter, loadStoryChecks, NotReadyError } = await import("@/lib/admin/publish");
  const { setTags } = await import("@/lib/admin/story-store");
  let db: Awaited<ReturnType<typeof signedInClient>>;
  const made: number[] = [];

  /* A story with a title, summary, rating and fandom, so it may be published. `ready: false` leaves out all but the title. */
  async function draftStory(slug: string, opts: { ready?: boolean } = {}) {
    const ready = opts.ready ?? true;
    const { data: fic } = await db.from("fics").insert({
      slug, title: `(e2e ${slug})`, category_id: 1, ...(ready ? { summary: "<p>(e2e summary)</p>", rating: "teen" as const } : {}),
    }).select("id").single();
    made.push(fic!.id);
    if (ready) await setTags(db, fic!.id, { fandom: ["(e2e fandom)"] });
    const { data: ch } = await db.from("chapters").insert({ fic_id: fic!.id, position: 1, body: "<p>a</p>", word_count: 1 }).select("id").single();
    return { ficId: fic!.id, chapterId: ch!.id };
  }

  beforeAll(async () => { db = await signedInClient(TEST_ADMIN.email, TEST_ADMIN.password); });
  afterAll(async () => {
    for (const id of made) await db.from("fics").delete().eq("id", id);
    await db.from("tags").delete().eq("name", "(e2e fandom)");
  });

  test("publishing a chapter of a draft story makes both visible to readers", async () => {
    const { chapterId } = await draftStory("e2e-pub-a");
    await publishChapterAt(db, chapterId, new Date());
    const reader = createReaderClient();
    expect((await reader.from("fics").select("slug").eq("slug", "e2e-pub-a")).data).toEqual([{ slug: "e2e-pub-a" }]);
    expect((await reader.from("chapters").select("id").eq("id", chapterId)).data).toHaveLength(1);
  });

  test("publishing a later chapter doesn't move the story's own date", async () => {
    const { ficId, chapterId } = await draftStory("e2e-pub-b");
    await publishChapterAt(db, chapterId, new Date(Date.now() - 86_400_000));
    const before = (await db.from("fics").select("publish_at").eq("id", ficId).single()).data!.publish_at;
    const { data: ch2 } = await db.from("chapters").insert({ fic_id: ficId, position: 2 }).select("id").single();
    await publishChapterAt(db, ch2!.id, new Date());
    expect((await db.from("fics").select("publish_at").eq("id", ficId).single()).data!.publish_at).toBe(before);
  });

  test("scheduling an hour ahead keeps it hidden; a past schedule time is refused", async () => {
    const { chapterId } = await draftStory("e2e-pub-c");
    await publishChapterAt(db, chapterId, new Date(Date.now() + 3_600_000), { future: true });
    expect((await createReaderClient().from("fics").select("slug").eq("slug", "e2e-pub-c")).data).toEqual([]);
    await expect(publishChapterAt(db, chapterId, new Date(Date.now() - 60_000), { future: true })).rejects.toThrow(/future/);
  });

  test("unpublishing the only live chapter takes the story off the site too", async () => {
    const { ficId, chapterId } = await draftStory("e2e-pub-e");
    await publishChapterAt(db, chapterId, new Date());
    await unpublishChapter(db, chapterId);
    expect((await db.from("fics").select("publish_at").eq("id", ficId).single()).data!.publish_at).toBeNull();
    expect((await createReaderClient().from("fics").select("slug").eq("slug", "e2e-pub-e")).data).toEqual([]);
  });

  test("rescheduling later moves the story's date with it", async () => {
    const { ficId, chapterId } = await draftStory("e2e-pub-f");
    const monday = new Date(Date.now() + 2 * 86_400_000), friday = new Date(Date.now() + 5 * 86_400_000);
    await publishChapterAt(db, chapterId, monday, { future: true });
    await publishChapterAt(db, chapterId, friday, { future: true });
    const at = (await db.from("fics").select("publish_at").eq("id", ficId).single()).data!.publish_at!;
    expect(Date.parse(at)).toBe(friday.getTime());
  });

  test("unpublishing puts the chapter back to draft", async () => {
    const { chapterId } = await draftStory("e2e-pub-d");
    await publishChapterAt(db, chapterId, new Date());
    await unpublishChapter(db, chapterId);
    expect((await createReaderClient().from("chapters").select("id").eq("id", chapterId)).data).toEqual([]);
  });

  test("publishing is refused until title, summary, rating and fandom are there", async () => {
    const { ficId, chapterId } = await draftStory("e2e-pub-g", { ready: false });
    await expect(publishChapterAt(db, chapterId, new Date())).rejects.toThrow("Before publishing: add a summary, pick a rating and add a fandom.");
    await expect(publishChapterAt(db, chapterId, new Date())).rejects.toBeInstanceOf(NotReadyError);
    expect((await db.from("chapters").select("publish_at").eq("id", chapterId).single()).data!.publish_at).toBeNull();
    expect((await db.from("fics").select("publish_at").eq("id", ficId).single()).data!.publish_at).toBeNull();
    expect((await createReaderClient().from("fics").select("slug").eq("slug", "e2e-pub-g")).data).toEqual([]);
  });

  test("scheduling is refused the same way", async () => {
    const { chapterId } = await draftStory("e2e-pub-h", { ready: false });
    await expect(publishChapterAt(db, chapterId, new Date(Date.now() + 3_600_000), { future: true })).rejects.toBeInstanceOf(NotReadyError);
  });

  test("a story called Untitled can't be published", async () => {
    const { ficId, chapterId } = await draftStory("e2e-pub-i");
    await db.from("fics").update({ title: "Untitled" }).eq("id", ficId);
    await expect(publishChapterAt(db, chapterId, new Date())).rejects.toThrow("Before publishing: add a title.");
  });

  test("unpublishing never needs the basics", async () => {
    const { ficId, chapterId } = await draftStory("e2e-pub-j");
    await publishChapterAt(db, chapterId, new Date());
    await db.from("fics").update({ summary: "" }).eq("id", ficId);
    await unpublishChapter(db, chapterId);
    expect((await db.from("chapters").select("publish_at").eq("id", chapterId).single()).data!.publish_at).toBeNull();
  });

  test("loadStoryChecks reads the saved story", async () => {
    const ready = await draftStory("e2e-pub-k");
    expect((await loadStoryChecks(db, ready.ficId)).every((c) => c.ok)).toBe(true);
    const bare = await draftStory("e2e-pub-l", { ready: false });
    const checks = await loadStoryChecks(db, bare.ficId);
    expect(checks.filter((c) => !c.ok).map((c) => c.key)).toEqual(["summary", "rating", "fandom"]);
  });
});
