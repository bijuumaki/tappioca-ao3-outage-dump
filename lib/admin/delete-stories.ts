import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

export type DeleteResult = { ok: true; count: number } | { ok: false; error: string };

/* Removes whole stories. Their chapters, tags, versions, upload records and comments go with them (the database cascades). */
export async function deleteStoriesCore(db: SupabaseClient<Database>, ids: number[]): Promise<DeleteResult> {
  const clean = [...new Set(ids)].filter((n) => Number.isInteger(n) && n > 0);
  if (clean.length === 0 || clean.length > 100) return { ok: false, error: "Pick the stories to delete first." };
  const { data, error } = await db.from("fics").delete().in("id", clean).select("id");
  if (error) return { ok: false, error: "Couldn’t delete. Try again." };
  return { ok: true, count: data?.length ?? 0 };
}
