import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { createBridge } from "@/lib/drive/bridge";
import { driveStatus, importFiles, saveOriginals } from "@/lib/drive/flows";
import { processUploadBatch } from "@/lib/admin/upload-process";
import { ensureAdmin, hasSecret, secretClient, signedInClient, TEST_ADMIN } from "../support/supabase-admin";
import { startMockDrive, type MockDrive } from "../support/mock-drive";

const enc = (s: string) => new TextEncoder().encode(s);

describe.skipIf(!hasSecret())("google drive flows", () => {
  let db: Awaited<ReturnType<typeof signedInClient>>;
  let mock: MockDrive;
  let bridge: ReturnType<typeof createBridge>;
  const paths: string[] = [];

  async function uploaded(name: string, content: string) {
    const path = `fics/new/e2e-drive-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${name.replace(/[^A-Za-z0-9._-]/g, "_")}`;
    expect((await db.storage.from("uploads").upload(path, enc(content))).error).toBeNull();
    paths.push(path);
    return { name, path };
  }
  async function cleanUp() {
    const admin = secretClient();
    const { data } = await admin.from("fics").select("id").like("title", "(e2e drive%");
    for (const f of data ?? []) await admin.from("fics").delete().eq("id", f.id);
    await admin.from("tags").delete().like("name", "(e2e drive%");
    const { data: objs } = await admin.storage.from("uploads").list("fics/new");
    const mine = (objs ?? []).filter((o) => o.name.includes("e2e-drive")).map((o) => `fics/new/${o.name}`);
    if (mine.length) await admin.storage.from("uploads").remove(mine);
  }

  beforeAll(async () => {
    await ensureAdmin(TEST_ADMIN.email, TEST_ADMIN.password);
    db = await signedInClient(TEST_ADMIN.email, TEST_ADMIN.password);
    mock = await startMockDrive();
    bridge = createBridge({ url: mock.url, token: mock.token });
    await cleanUp();
  });
  afterAll(async () => { await mock.stop(); await cleanUp(); });
  beforeEach(() => { mock.files.length = 0; mock.calls.length = 0; mock.setMode("ok"); });

  test("status: not connected, connected, or a plain-words problem", async () => {
    expect(await driveStatus(null)).toEqual({ state: "not_configured" });
    expect(await driveStatus(bridge)).toEqual({ state: "connected", folder: "(mock) Fic Library" });
    mock.setMode("html");
    const bad = await driveStatus(bridge);
    expect(bad.state).toBe("error");
  });

  test("saving an original puts it in the fic's fandom folder and remembers it", async () => {
    const file = await uploaded("(e2e drive save).md", "---\nfandom: (e2e drive fandom)\n---\n\nsaved words");
    const { results } = await processUploadBatch(db, [file], null);
    expect(results[0].ok).toBe(true);
    const out = await saveOriginals(db, bridge, [file], results[0].ficId!);
    expect(out).toEqual([{ name: "(e2e drive save).md", saved: true, message: expect.stringMatching(/saved to Google Drive/i) }]);
    expect(mock.files.map((f) => f.path)).toEqual(["(e2e drive fandom)/(e2e drive save).md"]);
    expect(mock.files[0].bytes.toString()).toContain("saved words");
    const { data } = await db.from("upload_files").select("drive_status, drive_file_id").eq("storage_path", file.path).single();
    expect(data).toEqual({ drive_status: "saved", drive_file_id: mock.files[0].id });
  });

  test("a fic with no fandom goes in Unsorted", async () => {
    const file = await uploaded("(e2e drive nofandom).md", "plain words");
    const { results } = await processUploadBatch(db, [file], null);
    await saveOriginals(db, bridge, [file], results[0].ficId!);
    expect(mock.files[0].path).toBe("Unsorted/(e2e drive nofandom).md");
  });

  test("when Drive fails, the chapters are untouched and the file is marked failed", async () => {
    const file = await uploaded("(e2e drive fail).md", "kept words");
    const { results } = await processUploadBatch(db, [file], null);
    const ficId = results[0].ficId!;
    mock.setMode("fail");
    const out = await saveOriginals(db, bridge, [file], ficId);
    expect(out[0].saved).toBe(false);
    expect(out[0].message).toMatch(/couldn’t save to Google Drive/i);
    const { data: ch } = await db.from("chapters").select("body").eq("fic_id", ficId);
    expect(ch).toHaveLength(1);
    expect(ch![0].body).toContain("kept words");
    const { data } = await db.from("upload_files").select("drive_status, drive_error").eq("storage_path", file.path).single();
    expect(data!.drive_status).toBe("failed");
    expect(data!.drive_error).toBeTruthy();
  });

  test("the same original twice never overwrites the first", async () => {
    const a = await uploaded("(e2e drive twice).md", "first");
    const b = await uploaded("(e2e drive twice).md", "second");
    const { results } = await processUploadBatch(db, [a], null);
    const ficId = results[0].ficId!;
    await saveOriginals(db, bridge, [a], ficId);
    await processUploadBatch(db, [b], ficId);
    await saveOriginals(db, bridge, [b], ficId);
    expect(mock.files).toHaveLength(2);
    expect(new Set(mock.files.map((f) => f.path)).size).toBe(2);
    expect(mock.files[0].bytes.toString()).toBe("first");
  });

  test("importing two numbered files makes one fic with two draft chapters, and sends nothing back to Drive", async () => {
    const add = (p: string, c: string) => { mock.files.push({ id: `MOCK_ID_imp_${mock.files.length}`, path: p, name: p.split("/").pop()!, bytes: Buffer.from(c), modified: "2026-11-03T10:00:00.000Z" }); return mock.files[mock.files.length - 1]; };
    const f2 = add("Resident Evil/(e2e drive imp) - 2.md", "second imported");
    const f1 = add("Resident Evil/(e2e drive imp) - 1.md", "first imported");
    const results = await importFiles(db, bridge, [{ id: f2.id, name: f2.name }, { id: f1.id, name: f1.name }], null);
    expect(results.every((r) => r.ok)).toBe(true);
    const ficId = results[0].ficId!;
    const { data: ch } = await db.from("chapters").select("position, body, publish_at").eq("fic_id", ficId).order("position");
    expect(ch!.map((c) => c.position)).toEqual([1, 2]);
    expect(ch![0].body).toContain("first imported");
    expect(ch!.every((c) => c.publish_at === null)).toBe(true);
    expect(mock.calls.filter((c) => c.startsWith("put"))).toEqual([]);
    const { data: rows } = await db.from("upload_files").select("drive_status, drive_file_id").eq("fic_id", ficId);
    expect(rows!.every((r) => r.drive_status === "saved" && r.drive_file_id?.startsWith("MOCK_ID_imp_"))).toBe(true);
  });

  test("a file that vanished, a wrong type and a duplicate name each get their own message while the rest go through", async () => {
    const good = { id: "MOCK_ID_good", path: "x/(e2e drive mix) - 1.md", name: "(e2e drive mix) - 1.md", bytes: Buffer.from("good words"), modified: "" };
    const exe = { id: "MOCK_ID_exe", path: "x/(e2e drive tool).exe", name: "(e2e drive tool).exe", bytes: Buffer.from("MZ"), modified: "" };
    mock.files.push(good, exe);
    const results = await importFiles(db, bridge, [
      { id: good.id, name: good.name }, { id: "MOCK_ID_gone", name: "(e2e drive gone).md" }, { id: exe.id, name: exe.name }, { id: good.id, name: good.name },
    ], null);
    const by = (n: string) => results.filter((r) => r.name === n);
    expect(by("(e2e drive mix) - 1.md").some((r) => r.ok)).toBe(true);
    expect(by("(e2e drive gone).md")[0]).toMatchObject({ ok: false, message: expect.stringMatching(/no longer in Google Drive/i) });
    expect(by("(e2e drive tool).exe")[0]).toMatchObject({ ok: false, message: expect.stringMatching(/isn’t a type I can read/i) });
    expect(results.filter((r) => /same name/i.test(r.message))).toHaveLength(1);
    const ficIds = results.filter((r) => r.ok).map((r) => r.ficId!);
    expect(new Set(ficIds).size).toBe(1);
  });
});
