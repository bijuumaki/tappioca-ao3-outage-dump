import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { createReaderClient } from "@/lib/supabase/server";
import { ensureAdmin, hasSecret, secretClient, signedInClient, TEST_ADMIN } from "../support/supabase-admin";

describe.skipIf(!hasSecret())("comments: what readers can see and do", () => {
  const db = secretClient();
  const made: number[] = [];

  async function chapterId(slug: string, position: number): Promise<number> {
    const { data: fic } = await db.from("fics").select("id").eq("slug", slug).single();
    const { data } = await db.from("chapters").select("id").eq("fic_id", fic!.id).eq("position", position).single();
    return data!.id;
  }
  async function comment(chapter_id: number, over: Partial<{ name: string; body: string; hidden: boolean; by_author: boolean; parent_id: number }> = {}): Promise<number> {
    const { data, error } = await db.from("comments").insert({ chapter_id, name: "(e2e reader)", body: "(e2e comment)", ...over }).select("id").single();
    if (error) throw error;
    made.push(data.id);
    return data.id;
  }

  beforeAll(async () => {
    await db.from("comments").delete().like("name", "(e2e%");
    await db.from("fics").delete().eq("slug", "e2e-comment-cascade");
  });
  afterAll(async () => { for (const id of made) await db.from("comments").delete().eq("id", id); });

  test("a reader sees a comment on a published chapter", async () => {
    const id = await comment(await chapterId("sample-fic", 1));
    const { data } = await createReaderClient().from("comments").select("id, name, body").eq("id", id);
    expect(data).toEqual([{ id, name: "(e2e reader)", body: "(e2e comment)" }]);
  });

  test("hidden comments are not shown to readers", async () => {
    const id = await comment(await chapterId("sample-fic", 1), { hidden: true });
    expect((await createReaderClient().from("comments").select("id").eq("id", id)).data).toEqual([]);
  });

  test("comments on a scheduled chapter or a draft story are not shown", async () => {
    const scheduled = await comment(await chapterId("sample-fic", 3));
    const draft = await comment(await chapterId("sample-draft", 1));
    expect((await createReaderClient().from("comments").select("id").in("id", [scheduled, draft])).data).toEqual([]);
  });

  test("readers cannot add, change or remove comments with the public key", async () => {
    const chapter = await chapterId("sample-fic", 1);
    const reader = createReaderClient();
    expect((await reader.from("comments").insert({ chapter_id: chapter, name: "(e2e intruder)", body: "x" })).error).not.toBeNull();
    const id = await comment(chapter);
    await reader.from("comments").update({ body: "changed" }).eq("id", id);
    await reader.from("comments").delete().eq("id", id);
    const { data } = await db.from("comments").select("body").eq("id", id);
    expect(data).toEqual([{ body: "(e2e comment)" }]);
  });

  test("the spam-throttle table is closed to readers", async () => {
    const id = await comment(await chapterId("sample-fic", 1));
    await db.from("comment_meta").insert({ comment_id: id, ip_hash: "(e2e hash)" });
    expect((await createReaderClient().from("comment_meta").select("*").eq("comment_id", id)).data).toEqual([]);
  });

  test("an author reply points at its comment", async () => {
    const chapter = await chapterId("sample-fic", 1);
    const parent = await comment(chapter);
    const reply = await comment(chapter, { name: "Author", by_author: true, parent_id: parent });
    const { data } = await createReaderClient().from("comments").select("id, parent_id, by_author").eq("id", reply);
    expect(data).toEqual([{ id: reply, parent_id: parent, by_author: true }]);
  });

  test("deleting a chapter deletes its comments", async () => {
    const { data: cat } = await db.from("categories").select("id").eq("slug", "fic").single();
    const { data: fic } = await db.from("fics").insert({ slug: "e2e-comment-cascade", title: "(e2e cascade)", category_id: cat!.id }).select("id").single();
    const { data: ch } = await db.from("chapters").insert({ fic_id: fic!.id, position: 1 }).select("id").single();
    const id = await comment(ch!.id);
    await db.from("fics").delete().eq("id", fic!.id);
    expect((await db.from("comments").select("id").eq("id", id)).data).toEqual([]);
  });

  test("the admin sees hidden comments and can hide one", async () => {
    await ensureAdmin(TEST_ADMIN.email, TEST_ADMIN.password);
    const admin = await signedInClient(TEST_ADMIN.email, TEST_ADMIN.password);
    const id = await comment(await chapterId("sample-fic", 1), { hidden: true });
    expect((await admin.from("comments").select("id").eq("id", id)).data).toEqual([{ id }]);
    const shown = await comment(await chapterId("sample-fic", 1));
    expect((await admin.from("comments").update({ hidden: true }).eq("id", shown)).error).toBeNull();
    expect((await createReaderClient().from("comments").select("id").eq("id", shown)).data).toEqual([]);
  });
});
