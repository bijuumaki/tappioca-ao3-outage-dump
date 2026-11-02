"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/session";
import { htmlToNotes } from "./notes";
import { listVersionRows, restoreVersionTo, saveVersion, type VersionReason, type VersionRow } from "./versions";

export async function listVersions(chapterId: number): Promise<VersionRow[]> {
  const { db } = await requireAdmin();
  return listVersionRows(db, chapterId);
}

export type Restored = { title: string; notes_before: string; notes_after: string; body: string };

/* Brings an earlier version's text back into the chapter; returns it so the editor can show it. */
export async function restoreVersion(versionId: number): Promise<Restored | null> {
  const { db } = await requireAdmin();
  const r = await restoreVersionTo(db, versionId);
  if (!r) return null;
  const { data: ch } = await db.from("chapters").select("fic_id, publish_at").eq("id", r.chapterId).single();
  if (ch) {
    revalidatePath(`/admin/stories/${ch.fic_id}`);
    if (ch.publish_at) {
      const { data: fic } = await db.from("fics").select("slug").eq("id", ch.fic_id).single();
      if (fic) revalidatePath(`/fics/${fic.slug}`, "layout");
    }
  }
  return { title: r.title ?? "", notes_before: htmlToNotes(r.notes_before), notes_after: htmlToNotes(r.notes_after), body: r.body };
}

/* Keeps a copy of the chapter as it is now (used before a paste replaces it). Returns false if the copy couldn't be kept. */
export async function snapshotChapter(chapterId: number, reason: VersionReason): Promise<boolean> {
  const { db } = await requireAdmin();
  return (await saveVersion(db, chapterId, reason)) !== "error";
}
