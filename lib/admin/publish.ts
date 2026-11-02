import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;

/* Publishes (or, with future, schedules) one chapter. The story goes live with it if it wasn't live yet,
   or earlier if it was only scheduled later; an already-published story keeps its own date. */
export async function publishChapterAt(db: Db, chapterId: number, when: Date, opts: { future?: boolean } = {}): Promise<{ ficId: number; slug: string }> {
  if (opts.future && when.getTime() <= Date.now()) throw new Error("Pick a time in the future to schedule.");
  const iso = when.toISOString();
  const { data: ch, error } = await db.from("chapters").update({ publish_at: iso }).eq("id", chapterId).select("fic_id").single();
  if (error) throw error;
  const { data: fic, error: e2 } = await db.from("fics").select("id, slug, publish_at").eq("id", ch.fic_id).single();
  if (e2) throw e2;
  if (!fic.publish_at || Date.parse(fic.publish_at) > when.getTime()) {
    const { error: e3 } = await db.from("fics").update({ publish_at: iso }).eq("id", fic.id);
    if (e3) throw e3;
  }
  return { ficId: fic.id, slug: fic.slug };
}

export async function unpublishChapter(db: Db, chapterId: number): Promise<{ ficId: number; slug: string }> {
  const { data: ch, error } = await db.from("chapters").update({ publish_at: null }).eq("id", chapterId).select("fic_id").single();
  if (error) throw error;
  const { data: fic } = await db.from("fics").select("id, slug").eq("id", ch.fic_id).single();
  return { ficId: fic!.id, slug: fic!.slug };
}
