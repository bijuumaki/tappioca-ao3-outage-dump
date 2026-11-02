import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;
export type VersionReason = "autosave" | "publish" | "upload" | "restore" | "paste";
/* saved = a copy was kept; skipped = none was needed; error = a copy was needed but couldn't be kept. */
export type SnapshotResult = "saved" | "skipped" | "error";
export const KEEP_VERSIONS = 20;
const AUTOSAVE_GAP_MS = 10 * 60 * 1000;

/* Autosave makes a version at most every 10 minutes; publishing, replacing by upload and restoring always do. */
export function shouldSnapshot(lastAt: string | null, now: number, reason: VersionReason): boolean {
  if (reason !== "autosave") return true;
  return lastAt === null || now - Date.parse(lastAt) >= AUTOSAVE_GAP_MS;
}

/* Copies the chapter's current text into its version history (when the rule above says so), keeping the newest 20. */
export async function saveVersion(db: Db, chapterId: number, reason: VersionReason, now = Date.now()): Promise<SnapshotResult> {
  const { data: last } = await db.from("chapter_versions").select("created_at").eq("chapter_id", chapterId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!shouldSnapshot(last?.created_at ?? null, now, reason)) return "skipped";
  const { data: ch, error } = await db.from("chapters").select("title, notes_before, body, notes_after, word_count").eq("id", chapterId).single();
  if (error || !ch) return "error";
  if (!ch.body.trim() && !(ch.title ?? "").trim()) return "skipped";
  const ins = await db.from("chapter_versions").insert({ chapter_id: chapterId, ...ch, reason, created_at: new Date(now).toISOString() });
  if (ins.error) return "error";
  const { data: all } = await db.from("chapter_versions").select("id").eq("chapter_id", chapterId).order("created_at", { ascending: false }).order("id", { ascending: false });
  const old = (all ?? []).slice(KEEP_VERSIONS).map((v) => v.id);
  if (old.length) await db.from("chapter_versions").delete().in("id", old);
  return "saved";
}

export type VersionRow = { id: number; reason: VersionReason; createdAt: string; words: number };

export async function listVersionRows(db: Db, chapterId: number): Promise<VersionRow[]> {
  const { data } = await db.from("chapter_versions").select("id, reason, created_at, word_count").eq("chapter_id", chapterId).order("created_at", { ascending: false }).order("id", { ascending: false });
  return (data ?? []).map((v) => ({ id: v.id, reason: v.reason as VersionReason, createdAt: v.created_at, words: v.word_count }));
}

/* Puts an earlier version's text back. The text it replaces is kept as a new version first, so a restore can be undone. */
export async function restoreVersionTo(db: Db, versionId: number): Promise<{ chapterId: number; title: string | null; notes_before: string; notes_after: string; body: string } | null> {
  const { data: v } = await db.from("chapter_versions").select("chapter_id, title, notes_before, body, notes_after, word_count").eq("id", versionId).maybeSingle();
  if (!v) return null;
  /* Never overwrite text that couldn't be copied first. */
  if ((await saveVersion(db, v.chapter_id, "restore")) === "error") return null;
  const { error } = await db.from("chapters").update({ title: v.title, notes_before: v.notes_before, body: v.body, notes_after: v.notes_after, word_count: v.word_count }).eq("id", v.chapter_id);
  if (error) return null;
  return { chapterId: v.chapter_id, title: v.title, notes_before: v.notes_before, notes_after: v.notes_after, body: v.body };
}
