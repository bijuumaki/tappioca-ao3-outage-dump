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
