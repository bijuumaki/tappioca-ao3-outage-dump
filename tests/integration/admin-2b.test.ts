import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { processUploadBatch } from "@/lib/admin/upload-process";
import { createReaderClient } from "@/lib/supabase/server";
import { ensureAdmin, ensureUser, hasSecret, secretClient, signedInClient, TEST_ADMIN, TEST_READER } from "../support/supabase-admin";

const enc = (s: string) => new TextEncoder().encode(s);

describe.skipIf(!hasSecret())("upload bin", () => {
  let db: Awaited<ReturnType<typeof signedInClient>>;
  const ficIds: number[] = [];
  const paths: string[] = [];

  async function put(name: string, content: string | Uint8Array) {
    const path = `fics/new/e2e-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${name.replace(/[^A-Za-z0-9._-]/g, "_")}`;
    const up = await db.storage.from("uploads").upload(path, typeof content === "string" ? enc(content) : content);
    expect(up.error).toBeNull();
    paths.push(path);
    return { name, path };
  }

  beforeAll(async () => {
    await ensureAdmin(TEST_ADMIN.email, TEST_ADMIN.password);
    await ensureUser(TEST_READER.email, TEST_READER.password);
    db = await signedInClient(TEST_ADMIN.email, TEST_ADMIN.password);
  });
  afterAll(async () => {
    const admin = secretClient();
    for (const id of ficIds) await admin.from("fics").delete().eq("id", id);
    if (paths.length) await admin.storage.from("uploads").remove(paths);
  });

  test("Title - 1 and Title - 2 become one draft fic with two draft chapters", async () => {
    const files = [await put("(e2e up) - 2.md", "second chapter words here"), await put("(e2e up) - 1.md", "first chapter words")];
    const { results } = await processUploadBatch(db, files, null);
    expect(results.every((r) => r.ok)).toBe(true);
    const ficId = results[0].ficId!;
    ficIds.push(ficId);
    expect(new Set(results.map((r) => r.ficId)).size).toBe(1);
    const { data: fic } = await db.from("fics").select("title, publish_at, slug").eq("id", ficId).single();
    expect(fic!.title).toBe("(e2e up)");
    expect(fic!.publish_at).toBeNull();
    const { data: chapters } = await db.from("chapters").select("position, body, word_count, publish_at").eq("fic_id", ficId).order("position");
    expect(chapters!.map((c) => c.position)).toEqual([1, 2]);
    expect(chapters![0].body).toContain("first chapter words");
    expect(chapters!.map((c) => c.word_count)).toEqual([3, 4]);
    expect(chapters!.every((c) => c.publish_at === null)).toBe(true);
    const { data: rows } = await db.from("upload_files").select("filename, status").eq("fic_id", ficId);
    expect(rows!.map((r) => r.status)).toEqual(["converted", "converted"]);
  });

  test("uploading chapter 2 again replaces its text and keeps the old text as a version", async () => {
    const ficId = ficIds[0];
    const again = await put("(e2e up) - 2.md", "replacement text");
    const { results } = await processUploadBatch(db, [again], ficId);
    expect(results[0].ok).toBe(true);
    const { data: ch } = await db.from("chapters").select("id, body").eq("fic_id", ficId).eq("position", 2).single();
    expect(ch!.body).toContain("replacement text");
    const { data: versions } = await db.from("chapter_versions").select("body, reason").eq("chapter_id", ch!.id);
    expect(versions!.length).toBe(1);
    expect(versions![0].body).toContain("second chapter words here");
    expect(versions![0].reason).toBe("upload");
  });

  test("a file with no chapter number is added after the last chapter, and gaps keep their numbers", async () => {
    const ficId = ficIds[0];
    const extra = await put("notes.txt", "added at the end");
    const { results } = await processUploadBatch(db, [extra], ficId);
    expect(results[0].ok).toBe(true);
    const five = await put("(e2e up) - 5.md", "a gap before me");
    await processUploadBatch(db, [five], ficId);
    const { data } = await db.from("chapters").select("position").eq("fic_id", ficId).order("position");
    expect(data!.map((c) => c.position)).toEqual([1, 2, 3, 5]);
  });

  test("replacing a chapter that is already published says readers see it now", async () => {
    const ficId = ficIds[0];
    const { data: ch } = await db.from("chapters").select("id").eq("fic_id", ficId).eq("position", 1).single();
    await db.from("chapters").update({ publish_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", ch!.id);
    const again = await put("(e2e up) - 1.md", "new first chapter");
    const { results } = await processUploadBatch(db, [again], ficId);
    expect(results[0].ok).toBe(true);
    expect(results[0].message).toMatch(/published.*readers see/i);
    await db.from("chapters").update({ publish_at: null }).eq("id", ch!.id);
  });

  test("one bad file doesn't stop the others", async () => {
    const bad = await put("broken.epub", "this is not a zip file");
    const good = await put("(e2e up fine).md", "good words");
    const { results } = await processUploadBatch(db, [bad, good], null);
    const byName = Object.fromEntries(results.map((r) => [r.name, r]));
    expect(byName["broken.epub"].ok).toBe(false);
    expect(byName["broken.epub"].message).toMatch(/epub/i);
    expect(byName["(e2e up fine).md"].ok).toBe(true);
    ficIds.push(byName["(e2e up fine).md"].ficId!);
    const { data: leftovers } = await db.from("fics").select("id").eq("title", "broken");
    expect(leftovers).toEqual([]);
  });

  test("front matter in a markdown file fills in the fic's details", async () => {
    const f = await put("(e2e up meta).md", "---\ntitle: (e2e up meta)\nrating: mature\nfandom: (e2e up fandom)\nsummary: (e2e summary)\n---\n\nbody words");
    const { results } = await processUploadBatch(db, [f], null);
    const ficId = results[0].ficId!;
    ficIds.push(ficId);
    const { data } = await db.from("fics").select("rating, summary").eq("id", ficId).single();
    expect(data).toEqual({ rating: "mature", summary: "(e2e summary)" });
    const { data: tags } = await db.from("fic_tags").select("tag:tags(type, name)").eq("fic_id", ficId);
    expect(tags!.map((t) => (t.tag as unknown as { name: string }).name)).toContain("(e2e up fandom)");
    await secretClient().from("tags").delete().like("name", "(e2e up%");
  });

  test("a signed-in non-admin can't use the bin: no upload URLs, no records, no versions", async () => {
    const reader = await signedInClient(TEST_READER.email, TEST_READER.password);
    const signed = await reader.storage.from("uploads").createSignedUploadUrl("fics/new/e2e-intruder.md");
    expect(signed.error).not.toBeNull();
    const ins = await reader.from("upload_files").insert({ filename: "x", storage_path: "x", kind: "md", status: "converted" });
    expect(ins.error).not.toBeNull();
    const { data } = await reader.from("chapter_versions").select("id");
    expect(data).toEqual([]);
    const anon = await createReaderClient().from("upload_files").select("id");
    expect(anon.data ?? []).toEqual([]);
  });
});

describe.skipIf(!hasSecret())("versions", async () => {
  const { saveVersion, restoreVersionTo, KEEP_VERSIONS } = await import("@/lib/admin/versions");
  let db: Awaited<ReturnType<typeof signedInClient>>;
  let ficId: number;
  let chapterId: number;

  beforeAll(async () => {
    await ensureAdmin(TEST_ADMIN.email, TEST_ADMIN.password);
    db = await signedInClient(TEST_ADMIN.email, TEST_ADMIN.password);
    const { data: fic } = await db.from("fics").insert({ slug: `e2e-versions-${Date.now()}`, title: "(e2e versions)", category_id: 1 }).select("id").single();
    ficId = fic!.id;
    const { data: ch } = await db.from("chapters").insert({ fic_id: ficId, position: 1, body: "<p>start</p>", word_count: 1 }).select("id").single();
    chapterId = ch!.id;
  });
  afterAll(async () => { await secretClient().from("fics").delete().eq("id", ficId); });

  test("only the newest 20 versions are kept", async () => {
    for (let i = 1; i <= KEEP_VERSIONS + 5; i++) {
      await db.from("chapters").update({ body: `<p>v${i}</p>` }).eq("id", chapterId);
      expect(await saveVersion(db, chapterId, "publish", Date.now() + i * 1000)).toBe("saved");
    }
    const { data } = await db.from("chapter_versions").select("body").eq("chapter_id", chapterId).order("created_at", { ascending: false });
    expect(data).toHaveLength(KEEP_VERSIONS);
    expect(data![0].body).toBe(`<p>v${KEEP_VERSIONS + 5}</p>`);
    expect(data![KEEP_VERSIONS - 1].body).toBe("<p>v6</p>");
  }, 90_000);

  test("a second autosave within 10 minutes makes no new version", async () => {
    const now = Date.now() + 10_000_000;
    expect(await saveVersion(db, chapterId, "autosave", now)).toBe("saved");
    expect(await saveVersion(db, chapterId, "autosave", now + 60_000)).toBe("skipped");
  });

  test("restoring brings back the old text and keeps the replaced text as a version", async () => {
    await db.from("chapters").update({ body: "<p>current text</p>" }).eq("id", chapterId);
    const { data: old } = await db.from("chapter_versions").select("id").eq("chapter_id", chapterId).eq("body", "<p>v10</p>").single();
    const restored = await restoreVersionTo(db, old!.id);
    expect(restored?.body).toBe("<p>v10</p>");
    const { data: ch } = await db.from("chapters").select("body").eq("id", chapterId).single();
    expect(ch!.body).toBe("<p>v10</p>");
    const { data: kept } = await db.from("chapter_versions").select("body, reason").eq("chapter_id", chapterId).eq("reason", "restore");
    expect(kept!.map((v) => v.body)).toContain("<p>current text</p>");
  });
});

describe.skipIf(!hasSecret())("pictures", async () => {
  const { storeImage } = await import("@/lib/admin/media");
  test("storing the same picture twice reuses one file, so editing a paste leaves no orphans", async () => {
    const db = await signedInClient(TEST_ADMIN.email, TEST_ADMIN.password);
    const { data: fic } = await db.from("fics").insert({ slug: `e2e-pic-${Date.now()}`, title: "(e2e pic)", category_id: 1 }).select("id").single();
    const png = new Uint8Array(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgGAWjgAEAAAEAAbhoEZYAAAAASUVORK5CYII=", "base64"));
    const a = await storeImage(db, fic!.id, png);
    const b = await storeImage(db, fic!.id, png);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) expect(a.url).toBe(b.url);
    const { data: files } = await db.storage.from("media").list(`fics/${fic!.id}/images`);
    expect(files).toHaveLength(1);
    await secretClient().storage.from("media").remove((files ?? []).map((f) => `fics/${fic!.id}/images/${f.name}`));
    await secretClient().from("fics").delete().eq("id", fic!.id);
  });
});
