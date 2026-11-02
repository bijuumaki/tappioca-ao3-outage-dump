import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TagType } from "@/lib/content/types";
import { slugify } from "@/lib/text/slug";

type Db = SupabaseClient<Database>;

/* Every story address already in use (optionally ignoring one story, so it can keep its own). */
export async function takenSlugs(db: Db, exceptId?: number): Promise<string[]> {
  const { data, error } = await db.from("fics").select("id, slug");
  if (error) throw error;
  return data.filter((f) => f.id !== exceptId).map((f) => f.slug);
}

/* Replaces the story's tags of the given types with these names, creating tags that don't exist yet. */
export async function setTags(db: Db, ficId: number, byType: Partial<Record<TagType, string[]>>) {
  const types = Object.keys(byType) as TagType[];
  const { data: current } = await db.from("fic_tags").select("tag_id, tag:tags(type)").eq("fic_id", ficId);
  const drop = (current ?? []).filter((r) => types.includes((r.tag as unknown as { type: TagType }).type)).map((r) => r.tag_id);
  if (drop.length) await db.from("fic_tags").delete().eq("fic_id", ficId).in("tag_id", drop);
  for (const type of types) {
    for (const name of byType[type] ?? []) {
      const slug = slugify(name);
      let { data: tag } = await db.from("tags").select("id").eq("type", type).eq("slug", slug).maybeSingle();
      if (!tag) {
        const ins = await db.from("tags").insert({ type, name, slug }).select("id").single();
        if (ins.error) throw ins.error;
        tag = ins.data;
      }
      await db.from("fic_tags").upsert({ fic_id: ficId, tag_id: tag.id });
    }
  }
}
