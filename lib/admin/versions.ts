import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;
export type VersionReason = "autosave" | "publish" | "upload" | "restore";
export const KEEP_VERSIONS = 20;
const AUTOSAVE_GAP_MS = 10 * 60 * 1000;

/* Autosave makes a version at most every 10 minutes; publishing, replacing by upload and restoring always do. */
export function shouldSnapshot(lastAt: string | null, now: number, reason: VersionReason): boolean {
  if (reason !== "autosave") return true;
  return lastAt === null || now - Date.parse(lastAt) >= AUTOSAVE_GAP_MS;
}

/* Copies the chapter's current text into its version history (when the rule above says so), keeping the newest 20. */
export async function saveVersion(db: Db, chapterId: number, reason: VersionReason, now = Date.now()): Promise<boolean> {
  const { data: last } = await db.from("chapter_versions").select("created_at").eq("chapter_id", chapterId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!shouldSnapshot(last?.created_at ?? null, now, reason)) return false;
  const { data: ch, error } = await db.from("chapters").select("title, notes_before, body, notes_after, word_count").eq("id", chapterId).single();
  if (error || !ch) return false;
  if (!ch.body.trim() && !(ch.title ?? "").trim()) return false;
  const ins = await db.from("chapter_versions").insert({ chapter_id: chapterId, ...ch, reason, created_at: new Date(now).toISOString() });
  if (ins.error) return false;
  const { data: all } = await db.from("chapter_versions").select("id").eq("chapter_id", chapterId).order("created_at", { ascending: false }).order("id", { ascending: false });
  const old = (all ?? []).slice(KEEP_VERSIONS).map((v) => v.id);
  if (old.length) await db.from("chapter_versions").delete().in("id", old);
  return true;
}
