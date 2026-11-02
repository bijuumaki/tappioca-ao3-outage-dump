"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { TagType } from "@/lib/content/types";
import { createSessionClient, requireAdmin } from "@/lib/supabase/session";
import { sanitizeRichText } from "@/lib/richtext/allowlist";
import { prepareChapter } from "./chapter";
import { publishChapterAt, unpublishChapter } from "./publish";
import { slugify } from "@/lib/text/slug";
import { storyDetailsFromForm, uniqueSlug } from "./story-form";

type Db = SupabaseClient<Database>;
export type SaveState = { ok: boolean; savedAt: string | null; error: string | null };

async function takenSlugs(db: Db, exceptId?: number): Promise<string[]> {
  const { data, error } = await db.from("fics").select("id, slug");
  if (error) throw error;
  return data.filter((f) => f.id !== exceptId).map((f) => f.slug);
}

/* Refresh the public pages a change could show up on. */
function refreshPublic(slug?: string) {
  revalidatePath("/");
  revalidatePath("/fics");
  if (slug) revalidatePath(`/fics/${slug}`, "layout");
}

/* A new draft story ("Untitled", category Fic) with one empty draft chapter. Returns its id. */
export async function createStory(): Promise<number> {
  const { db } = await requireAdmin();
  const { data: cat } = await db.from("categories").select("id").eq("slug", "fic").single();
  /* A temporary address, unique even if two drafts start at the same moment; the title replaces it. */
  const slug = `untitled-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const { data: fic, error } = await db.from("fics").insert({ slug, title: "Untitled", category_id: cat!.id }).select("id").single();
  if (error) throw error;
  const { error: e2 } = await db.from("chapters").insert({ fic_id: fic.id, position: 1 });
  if (e2) throw e2;
  return fic.id;
}

/* Replaces the story's tags of the given types with these names, creating tags that don't exist yet. */
async function setTags(db: Db, ficId: number, byType: Partial<Record<TagType, string[]>>) {
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

export async function saveStoryDetails(ficId: number, _prev: SaveState, form: FormData): Promise<SaveState> {
  const { db } = await requireAdmin();
  const d = storyDetailsFromForm(form);
  const { data: fic } = await db.from("fics").select("slug, title, publish_at").eq("id", ficId).single();
  if (!fic) return { ok: false, savedAt: null, error: "This story no longer exists." };
  /* The web address follows the title until the story is first published, then stays put. */
  const slug = !fic.publish_at && (d.title !== fic.title || fic.slug.startsWith("untitled-")) ? uniqueSlug(slugify(d.title), await takenSlugs(db, ficId)) : fic.slug;
  const { error } = await db.from("fics").update({ title: d.title, summary: d.summary, rating: d.rating, slug }).eq("id", ficId);
  if (error) return { ok: false, savedAt: null, error: "Couldn’t save. Try again." };
  await setTags(db, ficId, {
    fandom: d.fandom ? [d.fandom] : [], relationship: d.relationships, character: d.characters, warning: d.warnings, freeform: d.tags,
  });
  revalidatePath(`/admin/stories/${ficId}`);
  refreshPublic(slug);
  return { ok: true, savedAt: new Date().toISOString(), error: null };
}

export async function addChapter(ficId: number): Promise<void> {
  const { db } = await requireAdmin();
  const { data: last } = await db.from("chapters").select("position").eq("fic_id", ficId).order("position", { ascending: false }).limit(1).maybeSingle();
  const { data, error } = await db.from("chapters").insert({ fic_id: ficId, position: (last?.position ?? 0) + 1 }).select("id").single();
  if (error) throw error;
  redirect(`/admin/stories/${ficId}?chapter=${data.id}`);
}

const IMAGE_TYPES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/avif": "avif" };

export async function uploadCover(ficId: number, _prev: SaveState, form: FormData): Promise<SaveState> {
  const { db } = await requireAdmin();
  const file = form.get("cover");
  if (!(file instanceof File) || file.size === 0) return { ok: false, savedAt: null, error: "Choose an image first." };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { ok: false, savedAt: null, error: "That file isn’t a JPG, PNG, WebP, GIF or AVIF image." };
  if (file.size > 5 * 1024 * 1024) return { ok: false, savedAt: null, error: "That image is over 5 MB." };
  const { data: fic } = await db.from("fics").select("slug, cover_path").eq("id", ficId).single();
  const path = `fics/${ficId}/cover-${Date.now()}.${ext}`;
  const up = await db.storage.from("media").upload(path, file, { contentType: file.type });
  if (up.error) return { ok: false, savedAt: null, error: "The upload didn’t go through. Try again." };
  await db.from("fics").update({ cover_path: path }).eq("id", ficId);
  if (fic?.cover_path?.startsWith("fics/")) await db.storage.from("media").remove([fic.cover_path]);
  revalidatePath(`/admin/stories/${ficId}`);
  refreshPublic(fic?.slug);
  return { ok: true, savedAt: new Date().toISOString(), error: null };
}

export async function removeCover(ficId: number): Promise<void> {
  const { db } = await requireAdmin();
  const { data: fic } = await db.from("fics").select("slug, cover_path").eq("id", ficId).single();
  await db.from("fics").update({ cover_path: null }).eq("id", ficId);
  if (fic?.cover_path?.startsWith("fics/")) await db.storage.from("media").remove([fic.cover_path]);
  revalidatePath(`/admin/stories/${ficId}`);
  refreshPublic(fic?.slug);
}

export type ChapterInput = { title: string; notes_before: string; notes_after: string; body: string };
export type ChapterSaveResult = { ok: true; savedAt: string; words: number } | { ok: false; reason: "signed_out" | "error" };

/* Autosave. Never changes whether a chapter is published. Returns instead of redirecting when signed out,
   so the editor can keep the text on screen and say so. */
export async function saveChapter(chapterId: number, input: ChapterInput): Promise<ChapterSaveResult> {
  const db = await createSessionClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, reason: "signed_out" };
  const { body, word_count } = prepareChapter(input.body);
  const { data, error } = await db.from("chapters").update({
    title: input.title.trim() || null,
    notes_before: sanitizeRichText(input.notes_before),
    notes_after: sanitizeRichText(input.notes_after),
    body, word_count,
  }).eq("id", chapterId).select("fic_id, publish_at").maybeSingle();
  if (error || !data) return { ok: false, reason: error ? "error" : "signed_out" };
  if (data.publish_at) {
    const { data: fic } = await db.from("fics").select("slug").eq("id", data.fic_id).single();
    refreshPublic(fic?.slug);
  }
  return { ok: true, savedAt: new Date().toISOString(), words: word_count };
}

export type PublishResult = { ok: true; status: "published" | "scheduled" | "draft"; at: string | null } | { ok: false; error: string };

async function afterPublish(ficId: number, slug: string) {
  revalidatePath(`/admin/stories/${ficId}`);
  revalidatePath("/admin");
  refreshPublic(slug);
}

export async function publishChapter(chapterId: number): Promise<PublishResult> {
  const { db } = await requireAdmin();
  try {
    const { ficId, slug } = await publishChapterAt(db, chapterId, new Date());
    await afterPublish(ficId, slug);
    return { ok: true, status: "published", at: new Date().toISOString() };
  } catch {
    return { ok: false, error: "Couldn’t publish. Try again." };
  }
}

/* localDateTime is "YYYY-MM-DDTHH:mm" in Philippine time (UTC+8, no daylight saving). */
export async function scheduleChapter(chapterId: number, localDateTime: string): Promise<PublishResult> {
  const { db } = await requireAdmin();
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(localDateTime)) return { ok: false, error: "Pick a date and time." };
  const when = new Date(`${localDateTime}:00+08:00`);
  try {
    const { ficId, slug } = await publishChapterAt(db, chapterId, when, { future: true });
    await afterPublish(ficId, slug);
    return { ok: true, status: "scheduled", at: when.toISOString() };
  } catch (e) {
    return { ok: false, error: e instanceof Error && /future/.test(e.message) ? e.message : "Couldn’t schedule. Try again." };
  }
}

export async function unpublish(chapterId: number): Promise<PublishResult> {
  const { db } = await requireAdmin();
  const { ficId, slug } = await unpublishChapter(db, chapterId);
  await afterPublish(ficId, slug);
  return { ok: true, status: "draft", at: null };
}
