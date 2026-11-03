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

/* Newest comments first (50 at a time; `next` is the cursor for older ones), each with its replies. Hidden ones are included (marked), because the admin client sees everything. */
export type CommentStatus = "waiting" | "approved" | "all";

export async function listAdminComments(db: Db, opts: { limit?: number; before?: number; status?: CommentStatus; ficId?: number } = {}): Promise<{ comments: AdminComment[]; next: number | null }> {
  const limit = opts.limit ?? 50;
  let q = db.from("comments")
    .select(opts.ficId ? "id, name, body, hidden, by_author, created_at, parent_id, chapter:chapters!inner(position, fic_id, fic:fics(id, title))" : "id, name, body, hidden, by_author, created_at, parent_id, chapter:chapters(position, fic:fics(id, title))")
    .is("parent_id", null).order("id", { ascending: false }).limit(limit + 1);
  if (opts.before) q = q.lt("id", opts.before);
  if (opts.ficId) q = q.eq("chapter.fic_id", opts.ficId);
  if (opts.status === "waiting") q = q.eq("hidden", true);
  if (opts.status === "approved") q = q.eq("hidden", false);
  const { data: fetched, error } = await q;
  if (error) throw error;
  const more = fetched.length > limit;
  const data = fetched.slice(0, limit);
  const ids = data.map((c) => c.id);
  const { data: replies, error: e2 } = ids.length
    ? await db.from("comments").select("id, body, hidden, created_at, parent_id").in("parent_id", ids).order("created_at", { ascending: true }).order("id", { ascending: true })
    : { data: [], error: null };
  if (e2) throw e2;
  const comments = data.map((c) => {
    const ch = c.chapter as unknown as Joined;
    return {
      id: c.id, name: c.name, body: c.body, hidden: c.hidden, byAuthor: c.by_author, createdAt: c.created_at, parentId: c.parent_id,
      ficId: ch.fic.id, storyTitle: ch.fic.title, chapterPosition: ch.position,
      replies: (replies ?? []).filter((r) => r.parent_id === c.id).map((r) => ({ id: r.id, body: r.body, hidden: r.hidden, createdAt: r.created_at })),
    };
  });
  return { comments, next: more ? data[data.length - 1].id : null };
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

/* How many top-level comments are waiting / approved, for the tab counts (optionally for one story). */
export async function commentCounts(db: Db, ficId?: number): Promise<{ waiting: number; approved: number; all: number }> {
  const count = async (hidden: boolean | null) => {
    let q = db.from("comments").select(ficId ? "id, chapter:chapters!inner(fic_id)" : "id", { count: "exact", head: true }).is("parent_id", null);
    if (hidden !== null) q = q.eq("hidden", hidden);
    if (ficId) q = q.eq("chapter.fic_id", ficId);
    const { count: n, error } = await q;
    if (error) throw error;
    return n ?? 0;
  };
  const [waiting, approved] = await Promise.all([count(true), count(false)]);
  return { waiting, approved, all: waiting + approved };
}

/* The stories that have comments, for the story filter. */
export async function storiesWithComments(db: Db): Promise<{ id: number; title: string }[]> {
  const { data, error } = await db.from("fics").select("id, title").order("title");
  if (error) throw error;
  return data;
}

export async function deleteCommentCore(db: Db, id: number): Promise<CommentResult> {
  const { data, error } = await db.from("comments").delete().eq("id", id).select("id");
  return error || !data?.length ? { ok: false, error: "Couldn’t delete that comment. Try again." } : { ok: true };
}
