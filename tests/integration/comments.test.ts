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

describe.skipIf(!hasSecret())("comments: posting", async () => {
  const { postCommentCore } = await import("@/lib/comments/post");
  const { getComments } = await import("@/lib/comments/queries");
  const db = secretClient();
  const clean = async () => { await db.from("comments").delete().like("name", "(e2e%"); };
  beforeAll(clean);
  afterAll(clean);

  const base = { slug: "sample-fic", n: 1, name: "(e2e poster)", body: "(e2e posted)", ipHash: "(e2e hash a)" };

  test("a comment on a live chapter is stored and listed", async () => {
    const res = await postCommentCore(db, base, { alert: async () => {} });
    expect(res).toEqual({ error: "", posted: true });
    const list = await getComments("sample-fic", 1);
    expect(list.filter((c) => c.name === "(e2e poster)")).toMatchObject([{ body: "(e2e posted)", byAuthor: false, parentId: null }]);
  });

  test("blank fields give the canvas messages and store nothing", async () => {
    const before = (await getComments("sample-fic", 1)).length;
    expect(await postCommentCore(db, { ...base, name: "", body: "" }, { alert: async () => {} })).toEqual({ error: "Add your name and a comment to post.", posted: false });
    expect(await postCommentCore(db, { ...base, body: " " }, { alert: async () => {} })).toEqual({ error: "Write a comment to post.", posted: false });
    expect((await getComments("sample-fic", 1)).length).toBe(before);
  });

  test("the hidden trap field posts nothing but looks like success", async () => {
    const before = (await getComments("sample-fic", 1)).length;
    expect(await postCommentCore(db, { ...base, name: "(e2e bot)", website: "http://spam.example" }, { alert: async () => {} })).toEqual({ error: "", posted: true });
    expect((await getComments("sample-fic", 1)).length).toBe(before);
  });

  test("a draft story's chapter and a missing chapter are refused", async () => {
    expect(await postCommentCore(db, { ...base, slug: "sample-draft" }, { alert: async () => {} })).toEqual({ error: "That chapter isn’t available.", posted: false });
    expect(await postCommentCore(db, { ...base, n: 99 }, { alert: async () => {} })).toEqual({ error: "That chapter isn’t available.", posted: false });
  });

  test("the sixth comment from the same sender in ten minutes is refused", async () => {
    const throttled = { ...base, name: "(e2e flood)", ipHash: "(e2e hash flood)" };
    for (let i = 0; i < 5; i++) expect((await postCommentCore(db, throttled, { alert: async () => {} })).posted).toBe(true);
    expect(await postCommentCore(db, throttled, { alert: async () => {} })).toEqual({ error: "Slow down a little and try again in a few minutes.", posted: false });
    expect((await postCommentCore(db, { ...throttled, ipHash: "(e2e hash other)" }, { alert: async () => {} })).posted).toBe(true);
  });

  test("parallel posts from one sender cannot slip past the limit", async () => {
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) =>
      postCommentCore(db, { ...base, name: "(e2e par)", body: `(e2e par ${i})`, ipHash: "(e2e hash parallel)" }, { alert: async () => {} })));
    expect(results.filter((r) => r.posted)).toHaveLength(5);
    const { count } = await db.from("comments").select("id", { count: "exact", head: true }).eq("name", "(e2e par)");
    expect(count).toBe(5);
  });

  test("an email that never finishes does not hold up the comment", async () => {
    const res = await postCommentCore(db, { ...base, name: "(e2e slow mail)", ipHash: "(e2e hash slow)" }, { alert: () => new Promise<void>(() => {}) });
    expect(res).toEqual({ error: "", posted: true });
  });

  test("a database failure gives a plain message instead of throwing", async () => {
    const broken = { from: () => { throw new Error("db down"); }, rpc: () => { throw new Error("db down"); } } as unknown as typeof db;
    expect(await postCommentCore(broken, { ...base, ipHash: "(e2e hash broken)" }, { alert: async () => {} })).toEqual({ error: "Couldn’t post your comment. Try again.", posted: false });
  });

  test("HTML in a comment is kept as plain text", async () => {
    await postCommentCore(db, { ...base, name: "(e2e html)", body: "<script>alert(1)</script> <b>x</b>", ipHash: "(e2e hash html)" }, { alert: async () => {} });
    const c = (await getComments("sample-fic", 1)).find((x) => x.name === "(e2e html)");
    expect(c!.body).toBe("<script>alert(1)</script> <b>x</b>");
  });

  test("the author is told about the comment, and a failing email never stops it posting", async () => {
    const calls: unknown[] = [];
    await postCommentCore(db, { ...base, name: "(e2e alert)", ipHash: "(e2e hash alert)" }, { alert: async (c) => { calls.push(c); }, siteUrl: "https://example.test" });
    expect(calls).toEqual([{ ficTitle: "(sample fic)", chapterN: 1, name: "(e2e alert)", body: "(e2e posted)", url: "https://example.test/fics/sample-fic/1#comments-heading" }]);
    const res = await postCommentCore(db, { ...base, name: "(e2e alert fail)", ipHash: "(e2e hash alert2)" }, { alert: () => Promise.reject(new Error("boom")) });
    expect(res.posted).toBe(true);
  });
});

describe.skipIf(!hasSecret())("comments: the author's side", async () => {
  const { replyToCommentCore, setCommentHiddenCore, listAdminComments } = await import("@/lib/admin/comments");
  const { getComments } = await import("@/lib/comments/queries");
  const db = secretClient();
  let admin: Awaited<ReturnType<typeof signedInClient>>;
  let chapter: number;
  const clean = async () => { await db.from("comments").delete().like("name", "(e2e%"); };

  beforeAll(async () => {
    await clean();
    await ensureAdmin(TEST_ADMIN.email, TEST_ADMIN.password);
    admin = await signedInClient(TEST_ADMIN.email, TEST_ADMIN.password);
    const { data: fic } = await db.from("fics").select("id").eq("slug", "sample-fic").single();
    chapter = (await db.from("chapters").select("id").eq("fic_id", fic!.id).eq("position", 1).single()).data!.id;
  });
  afterAll(clean);

  async function top(name: string) {
    const { data } = await db.from("comments").insert({ chapter_id: chapter, name, body: "(e2e question)" }).select("id").single();
    return data!.id;
  }

  test("a reply is stored as the author's, on the same chapter, under its comment", async () => {
    const parent = await top("(e2e asker)");
    expect(await replyToCommentCore(admin, parent, "  Thank you!  ")).toEqual({ ok: true });
    const mine = (await getComments("sample-fic", 1)).filter((c) => c.parentId === parent);
    expect(mine).toMatchObject([{ name: "Author", body: "Thank you!", byAuthor: true }]);
  });

  test("a reply to a reply, an empty reply and a missing comment are refused", async () => {
    const parent = await top("(e2e asker two)");
    await replyToCommentCore(admin, parent, "First reply");
    const reply = (await getComments("sample-fic", 1)).find((c) => c.parentId === parent)!;
    expect(await replyToCommentCore(admin, reply.id, "Nested")).toEqual({ ok: false, error: "You can only reply to a comment." });
    expect(await replyToCommentCore(admin, parent, "   ")).toEqual({ ok: false, error: "Write a reply first." });
    expect(await replyToCommentCore(admin, 999999999, "Hello")).toEqual({ ok: false, error: "You can only reply to a comment." });
  });

  test("hiding takes a comment off the public page and showing brings it back", async () => {
    const id = await top("(e2e hide me)");
    expect(await setCommentHiddenCore(admin, id, true)).toEqual({ ok: true });
    expect((await getComments("sample-fic", 1)).some((c) => c.id === id)).toBe(false);
    expect(await setCommentHiddenCore(admin, id, false)).toEqual({ ok: true });
    expect((await getComments("sample-fic", 1)).some((c) => c.id === id)).toBe(true);
  });

  test("the admin list shows newest first, with replies under their comment and hidden ones marked", async () => {
    const older = await top("(e2e list older)");
    const newer = await top("(e2e list newer)");
    await replyToCommentCore(admin, older, "Reply in list");
    await setCommentHiddenCore(admin, newer, true);
    const { comments: list } = await listAdminComments(admin);
    const ids = list.map((c) => c.id);
    expect(ids.indexOf(newer)).toBeLessThan(ids.indexOf(older));
    const o = list.find((c) => c.id === older)!;
    expect(o.storyTitle).toBe("(sample fic)");
    expect(o.replies.map((r) => r.body)).toEqual(["Reply in list"]);
    expect(list.find((c) => c.id === newer)!.hidden).toBe(true);
    expect(list.every((c) => c.parentId === null)).toBe(true);
  });

  test("the admin list pages back through older comments", async () => {
    const a = await top("(e2e page a)"), b = await top("(e2e page b)"), c = await top("(e2e page c)");
    const first = await listAdminComments(admin, { limit: 2 });
    expect(first.comments.map((x) => x.id)).toEqual([c, b]);
    expect(first.next).toBe(b);
    const second = await listAdminComments(admin, { limit: 2, before: first.next! });
    expect(second.comments[0].id).toBe(a);
    expect(second.comments.every((x) => x.id < b)).toBe(true);
  });
});
