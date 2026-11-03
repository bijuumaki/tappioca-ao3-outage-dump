"use server";
import { createHash } from "node:crypto";
import { createSecretClient } from "@/lib/supabase/secret";
import { cleanMarks } from "./model";

/* Readers' highlights and notes, shared with Bijuu without names. The reader is only a hash of a random id their browser made,
   so nothing here says who they are. */
const READER_ID = /^[a-z0-9]{16,40}$/;
const hashReader = (id: string) => createHash("sha256").update(`tappioca-reader-v1:${id}`).digest("hex");
const MAX_PER_CALL = 200;
const MAX_PER_READER = 2000;

export async function shareMarks(readerId: string, marks: unknown): Promise<boolean> {
  if (!READER_ID.test(readerId)) return false;
  const list = cleanMarks(marks).slice(0, MAX_PER_CALL);
  if (list.length === 0) return true;
  try {
    const db = createSecretClient();
    const reader = hashReader(readerId);
    const gone = list.filter((m) => m.deleted).map((m) => m.id);
    const live = list.filter((m) => !m.deleted);
    if (gone.length) await db.from("reader_marks").delete().eq("reader", reader).in("id", gone);
    if (live.length) {
      const { count } = await db.from("reader_marks").select("id", { count: "exact", head: true }).eq("reader", reader);
      if ((count ?? 0) + live.length > MAX_PER_READER) return false;
      const { error } = await db.from("reader_marks").upsert(live.map((m) => ({
        id: m.id, reader, slug: m.slug, chapter_n: m.n, start_at: m.start, end_at: m.end, quote: m.quote, color: m.color, note: m.note,
        fic: m.fic, ch: m.ch, updated: m.updated,
      })));
      if (error) return false;
    }
    return true;
  } catch {
    return false;
  }
}

/* A reader turned sharing off: take everything of theirs back off the server. */
export async function withdrawShared(readerId: string): Promise<boolean> {
  if (!READER_ID.test(readerId)) return false;
  try {
    const { error } = await createSecretClient().from("reader_marks").delete().eq("reader", hashReader(readerId));
    return !error;
  } catch {
    return false;
  }
}
