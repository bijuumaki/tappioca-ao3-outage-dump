import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { publishBlockedMessage, storyChecks, type Check } from "./readiness";

type Db = SupabaseClient<Database>;

/* The story is missing something it needs before it can go public. The message is plain words for the author. */
export class NotReadyError extends Error {}

/* The four basics, read from what is saved (not from what is on screen). */
export async function loadStoryChecks(db: Db, ficId: number): Promise<Check[]> {
  const { data: fic, error } = await db.from("fics").select("title, summary, rating").eq("id", ficId).single();
  if (error) throw error;
  const { data: tags, error: e2 } = await db.from("fic_tags").select("tag:tags(type, name)").eq("fic_id", ficId);
  if (e2) throw e2;
  const fandom = (tags ?? []).map((r) => r.tag as unknown as { type: string; name: string }).find((t) => t.type === "fandom")?.name ?? "";
  return storyChecks({ title: fic.title, summaryHtml: fic.summary, rating: fic.rating, fandom });
}

/* The story is live from its earliest published or scheduled chapter. Recomputed after every change,
   so unpublishing or rescheduling never leaves a story card live without chapters, and publishing a
   later chapter never moves an already-live story's date. */
async function syncStoryDate(db: Db, ficId: number): Promise<{ ficId: number; slug: string }> {
  const { data: chapters, error } = await db.from("chapters").select("publish_at").eq("fic_id", ficId).not("publish_at", "is", null);
  if (error) throw error;
  const earliest = chapters.map((c) => c.publish_at!).sort((a, b) => Date.parse(a) - Date.parse(b))[0] ?? null;
  const { data: fic, error: e2 } = await db.from("fics").update({ publish_at: earliest }).eq("id", ficId).select("id, slug").single();
  if (e2) throw e2;
  return { ficId: fic.id, slug: fic.slug };
}

/* Publishes (or, with future, schedules) one chapter. */
export async function publishChapterAt(db: Db, chapterId: number, when: Date, opts: { future?: boolean } = {}): Promise<{ ficId: number; slug: string }> {
  if (opts.future && when.getTime() <= Date.now()) throw new Error("Pick a time in the future to schedule.");
  const { data: target, error: e0 } = await db.from("chapters").select("fic_id").eq("id", chapterId).single();
  if (e0) throw e0;
  const blocked = publishBlockedMessage(await loadStoryChecks(db, target.fic_id));
  if (blocked) throw new NotReadyError(blocked);
  const { data: ch, error } = await db.from("chapters").update({ publish_at: when.toISOString() }).eq("id", chapterId).select("fic_id").single();
  if (error) throw error;
  return syncStoryDate(db, ch.fic_id);
}

export async function unpublishChapter(db: Db, chapterId: number): Promise<{ ficId: number; slug: string }> {
  const { data: ch, error } = await db.from("chapters").update({ publish_at: null }).eq("id", chapterId).select("fic_id").single();
  if (error) throw error;
  return syncStoryDate(db, ch.fic_id);
}
