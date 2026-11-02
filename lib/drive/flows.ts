import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { checkUploadRequest } from "@/lib/admin/upload-rules";
import { processUploadBatch, type UploadResult } from "@/lib/admin/upload-process";
import type { Database } from "@/lib/supabase/database.types";
import { DriveError, type Bridge } from "./bridge";
import { fandomFolderName, safeDriveName } from "./names";

type Db = SupabaseClient<Database>;

export type DriveStatus = { state: "not_configured" } | { state: "connected"; folder: string } | { state: "error"; message: string };

const reason = (e: unknown) => (e instanceof DriveError ? e.message : "something unexpected went wrong.");

export async function driveStatus(bridge: Bridge | null): Promise<DriveStatus> {
  if (!bridge) return { state: "not_configured" };
  try { return { state: "connected", folder: (await bridge.ping()).folder }; }
  catch (e) { return { state: "error", message: reason(e) }; }
}

export type DriveSaveResult = { name: string; saved: boolean; message: string };

/* Sends the original files (already converted into chapters) to Drive: Fic Library / <fandom or "Unsorted"> / <file name>.
   This is a separate step after the chapters exist, so a slow or broken Drive can never lose or block an upload. */
export async function saveOriginals(db: Db, bridge: Bridge, items: { name: string; path: string }[], ficId: number): Promise<DriveSaveResult[]> {
  const { data: tags } = await db.from("fic_tags").select("tag:tags(type, name)").eq("fic_id", ficId);
  const fandom = (tags ?? []).map((t) => t.tag as unknown as { type: string; name: string }).find((t) => t.type === "fandom")?.name ?? null;
  const folder = fandomFolderName(fandom);
  const { data: rows } = await db.from("upload_files").select("storage_path").in("storage_path", items.map((i) => i.path)).eq("drive_status", "saved");
  const already = new Set((rows ?? []).map((r) => r.storage_path));
  const results: DriveSaveResult[] = [];
  for (const item of items) {
    if (already.has(item.path)) { results.push({ name: item.name, saved: true, message: "already in Google Drive" }); continue; }
    try {
      const { data: blob, error } = await db.storage.from("uploads").download(item.path);
      if (error || !blob) throw new Error("read-back");
      const saved = await bridge.put({ folder, name: safeDriveName(item.name), bytes: new Uint8Array(await blob.arrayBuffer()) });
      await db.from("upload_files").update({ drive_file_id: saved.id, drive_status: "saved", drive_error: null }).eq("storage_path", item.path);
      results.push({ name: item.name, saved: true, message: `saved to Google Drive (${saved.path})` });
    } catch (e) {
      const message = e instanceof Error && e.message === "read-back" ? "I couldn’t read the file back to send it." : reason(e);
      await db.from("upload_files").update({ drive_status: "failed", drive_error: message }).eq("storage_path", item.path);
      results.push({ name: item.name, saved: false, message: `couldn’t save to Google Drive: ${message}` });
    }
  }
  return results;
}

const safeStorageName = (name: string) => name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);

/* Brings files from the Drive folder in as draft chapters. They are not sent back to Drive (they're already there).
   One bad file (gone, wrong type, too big, same name twice) gets its own message and never stops the others. */
export async function importFiles(db: Db, bridge: Bridge, files: { id: string; name: string }[], ficId: number | null): Promise<UploadResult[]> {
  const out = new Map<number, UploadResult>();
  const items: { index: number; id: string; name: string; path: string }[] = [];
  const seen = new Set<string>();

  for (const [index, f] of files.entries()) {
    if (seen.has(f.name)) { out.set(index, { name: f.name, ok: false, message: "couldn’t import: another selected file has the same name. Import them one at a time." }); continue; }
    seen.add(f.name);
    const bad = checkUploadRequest([{ name: f.name, size: 1 }]);
    if (bad.length) { out.set(index, { name: f.name, ok: false, message: `couldn’t import: ${bad[0].message}` }); continue; }
    try {
      const got = await bridge.get(f.id);
      const path = `fics/${ficId ?? "new"}/${crypto.randomUUID()}-${safeStorageName(f.name)}`;
      const up = await db.storage.from("uploads").upload(path, got.bytes);
      if (up.error) throw new Error("store");
      items.push({ index, id: f.id, name: f.name, path });
    } catch (e) {
      out.set(index, { name: f.name, ok: false, message: `couldn’t import: ${e instanceof Error && e.message === "store" ? "the file didn’t arrive. Try again." : reason(e)}` });
    }
  }

  if (items.length) {
    const { results } = await processUploadBatch(db, items.map((i) => ({ name: i.name, path: i.path })), ficId);
    for (const r of results) {
      const item = items.find((i) => i.name === r.name)!;
      out.set(item.index, r);
      if (r.ok) await db.from("upload_files").update({ drive_file_id: item.id, drive_status: "saved" }).eq("storage_path", item.path);
    }
  }
  return files.map((_, i) => out.get(i)!).filter(Boolean);
}
