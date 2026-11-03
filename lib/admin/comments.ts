import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";

type Db = SupabaseClient<Database>;
export type CommentResult = { ok: true } | { ok: false; error: string };

export type AdminComment = {
  id: number; name: string; body: string; hidden: boolean; byAuthor: boolean; createdAt: string; parentId: number | null;
  ficId: number; storyTitle: string; chapterPosition: number;
  replies: { id: number; body: string; hidden: boolean; createdAt: string }[];
};

type Joined = { position: number; fic: { id: number; title: string } };

/* Newest comments first, each with its replies. Hidden ones are included (marked), because the admin client sees everything. */
export async function listAdminComments(db: Db, limit = 50): Promise<AdminComment[]> {
  const { data, error } = await db.from("comments")
    .select("id, name, body, hidden, by_author, created_at, parent_id, chapter:chapters(position, fic:fics(id, title))")
    .is("parent_id", null).order("created_at", { ascending: false }).order("id", { ascending: false }).limit(limit);
  if (error) throw error;
  const ids = data.map((c) => c.id);
  const { data: replies, error: e2 } = ids.length
    ? await db.from("comments").select("id, body, hidden, created_at, parent_id").in("parent_id", ids).order("created_at", { ascending: true }).order("id", { ascending: true })
    : { data: [], error: null };
  if (e2) throw e2;
  return data.map((c) => {
    const ch = c.chapter as unknown as Joined;
    return {
      id: c.id, name: c.name, body: c.body, hidden: c.hidden, byAuthor: c.by_author, createdAt: c.created_at, parentId: c.parent_id,
      ficId: ch.fic.id, storyTitle: ch.fic.title, chapterPosition: ch.position,
      replies: (replies ?? []).filter((r) => r.parent_id === c.id).map((r) => ({ id: r.id, body: r.body, hidden: r.hidden, createdAt: r.created_at })),
    };
  });
}

/* A reply goes under a top-level comment, on the same chapter, as "Author". */
export async function replyToCommentCore(db: Db, parentId: number, body: string): Promise<CommentResult> {
  const text = body.trim();
  if (!text) return { ok: false, error: "Write a reply first." };
  if (text.length > 5000) return { ok: false, error: "Keep your reply under 5,000 characters." };
  const { data: parent } = await db.from("comments").select("id, chapter_id, parent_id").eq("id", parentId).maybeSingle();
  if (!parent || parent.parent_id !== null) return { ok: false, error: "You can only reply to a comment." };
  const { error } = await db.from("comments").insert({ chapter_id: parent.chapter_id, parent_id: parent.id, name: "Author", body: text, by_author: true });
  return error ? { ok: false, error: "Couldn’t send the reply. Try again." } : { ok: true };
}

export async function setCommentHiddenCore(db: Db, id: number, hidden: boolean): Promise<CommentResult> {
  const { data, error } = await db.from("comments").update({ hidden }).eq("id", id).select("id");
  return error || !data?.length ? { ok: false, error: "Couldn’t change that comment. Try again." } : { ok: true };
}
