import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { Category, Chapter, Fic, Rating, Tag } from "@/lib/content/types";
import { statusOf, type StoryStatus } from "./status";

type Db = SupabaseClient<Database>;

export type AdminStoryRow = {
  id: number; slug: string; title: string; fandom: string | null; fandomSlug: string | null; rating: Rating;
  chapters: number; words: number; status: StoryStatus; updatedAt: string;
};

type Row = Fic & { fic_tags: { tag: Tag }[]; chapters: Pick<Chapter, "word_count" | "updated_at">[] };

/* All stories, drafts included (the admin's session sees everything), newest-updated first. */
export async function listAdminStories(db: Db): Promise<AdminStoryRow[]> {
  const { data, error } = await db.from("fics").select("*, fic_tags(tag:tags(*)), chapters(word_count, updated_at)");
  if (error) throw error;
  return (data as unknown as Row[])
    .map((f) => {
      const fandom = f.fic_tags.map((t) => t.tag).find((t) => t.type === "fandom") ?? null;
      const updated = [f.updated_at, ...f.chapters.map((c) => c.updated_at)].sort().pop()!;
      return {
        id: f.id, slug: f.slug, title: f.title, fandom: fandom?.name ?? null, fandomSlug: fandom?.slug ?? null, rating: f.rating,
        chapters: f.chapters.length, words: f.chapters.reduce((s, c) => s + c.word_count, 0),
        status: statusOf(f.publish_at), updatedAt: updated,
      };
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export type AdminStory = Fic & { category: Category; tags: Tag[]; chapters: Chapter[] };

export async function getAdminStory(db: Db, id: number): Promise<AdminStory | null> {
  const { data, error } = await db.from("fics").select("*, category:categories(*), fic_tags(tag:tags(*)), chapters(*)").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const row = data as unknown as Fic & { category: Category; fic_tags: { tag: Tag }[]; chapters: Chapter[] };
  const { fic_tags, ...fic } = row;
  return { ...fic, tags: fic_tags.map((t) => t.tag), chapters: [...row.chapters].sort((a, b) => a.position - b.position) };
}
