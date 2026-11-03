import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { readerName } from "@/lib/notes/names";

export type ReaderMark = {
  id: string; reader: string; name: string; slug: string; n: number; start: number; quote: string; color: string; note: string; fic: string; ch: string; updated: number;
};

/* The newest 1000 highlights and notes readers shared, each with its reader's assigned name. `notesOnly` keeps just the ones with a note. */
export async function listReaderMarks(db: SupabaseClient<Database>, notesOnly: boolean): Promise<ReaderMark[]> {
  let q = db.from("reader_marks").select("*").order("updated", { ascending: false }).limit(1000);
  if (notesOnly) q = q.neq("note", "");
  const { data, error } = await q;
  if (error) throw error;
  return data.map((r) => ({
    id: r.id, reader: r.reader, name: readerName(r.reader), slug: r.slug, n: r.chapter_n, start: r.start_at, quote: r.quote, color: r.color,
    note: r.note, fic: r.fic, ch: r.ch, updated: r.updated,
  }));
}
