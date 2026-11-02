"use server";
import { requireAdmin } from "@/lib/supabase/session";
import { bridgeFromEnv, DriveError, type DriveFile } from "@/lib/drive/bridge";
import { driveStatus, importFiles, saveOriginals, type DriveSaveResult, type DriveStatus } from "@/lib/drive/flows";
import { refreshAfterUpload } from "./upload-refresh";
import type { UploadResult } from "./upload-process";

const NOT_CONNECTED = "Google Drive isn’t connected yet.";

export async function getDriveStatus(): Promise<DriveStatus> {
  await requireAdmin();
  return driveStatus(bridgeFromEnv());
}

/* The files in the Fic Library folder that can be imported, listed by folder. Only asked for when the button is pressed. */
export async function listDriveFiles(): Promise<{ ok: true; files: DriveFile[] } | { ok: false; error: string }> {
  await requireAdmin();
  const bridge = bridgeFromEnv();
  if (!bridge) return { ok: false, error: NOT_CONNECTED };
  try {
    const files = await bridge.list();
    return { ok: true, files: files.sort((a, b) => a.path.localeCompare(b.path)) };
  } catch (e) {
    return { ok: false, error: e instanceof DriveError ? e.message : "Couldn’t read the Drive folder." };
  }
}

/* Sends originals of files that were just converted into fic `ficId` to Drive. Only files this fic's own upload records know about. */
export async function saveOriginalsToDrive(items: { name: string; path: string }[], ficId: number): Promise<DriveSaveResult[]> {
  const { db } = await requireAdmin();
  const bridge = bridgeFromEnv();
  if (!bridge) return items.map((i) => ({ name: i.name, saved: false, message: `couldn’t save to Google Drive: ${NOT_CONNECTED}` }));
  const wanted = items.filter((i) => i.path.startsWith("fics/") && !i.path.includes(".."));
  const { data: known } = await db.from("upload_files").select("storage_path").eq("fic_id", ficId).eq("status", "converted").in("storage_path", wanted.map((i) => i.path));
  const ok = new Set((known ?? []).map((k) => k.storage_path));
  return saveOriginals(db, bridge, wanted.filter((i) => ok.has(i.path)), ficId);
}

/* Brings the chosen Drive files in as draft chapters (one fic's files per call). They are not sent back to Drive. */
export async function importFromDrive(files: { id: string; name: string }[], ficId: number | null): Promise<{ results: UploadResult[] }> {
  const { db } = await requireAdmin();
  const bridge = bridgeFromEnv();
  if (!bridge) return { results: files.map((f) => ({ name: f.name, ok: false, message: `couldn’t import: ${NOT_CONNECTED}` })) };
  const results = await importFiles(db, bridge, files.slice(0, 40), ficId);
  await refreshAfterUpload(db, results);
  return { results };
}
