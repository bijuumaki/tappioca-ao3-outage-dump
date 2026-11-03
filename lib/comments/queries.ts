import { getChapter } from "@/lib/content/queries";
import { createReaderClient } from "@/lib/supabase/server";

export type PublicComment = { id: number; name: string; body: string; byAuthor: boolean; createdAt: string; parentId: number | null };

/* The comments a reader may see on one chapter, oldest first. Row-level security hides hidden comments and closed chapters. */
export async function getComments(slug: string, n: number): Promise<PublicComment[]> {
  const found = await getChapter(slug, n);
  if (!found) return [];
  const { data, error } = await createReaderClient().from("comments")
    .select("id, name, body, by_author, created_at, parent_id").eq("chapter_id", found.chapter.id).order("created_at", { ascending: true }).order("id", { ascending: true });
  if (error) throw error;
  return data.map((c) => ({ id: c.id, name: c.name, body: c.body, byAuthor: c.by_author, createdAt: c.created_at, parentId: c.parent_id }));
}
