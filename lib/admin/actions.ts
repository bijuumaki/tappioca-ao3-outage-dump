"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { htmlToChapter } from "@/lib/convert/html";
import { extractDataUriImages } from "@/lib/convert/images";
import { createSessionClient, requireAdmin } from "@/lib/supabase/session";
import { slugify } from "@/lib/text/slug";
import { prepareChapter } from "./chapter";
import { deleteStoriesCore, type DeleteResult } from "./delete-stories";
import { storeImage } from "./media";
import { notesToHtml } from "./notes";
import { loadStoryChecks, NotReadyError, publishChapterAt, unpublishChapter } from "./publish";
import type { Check } from "./readiness";
import { RATING_LABELS } from "@/lib/content/types";
import { storyDetailsFromForm, uniqueSlug } from "./story-form";
import { setTags, takenSlugs } from "./story-store";
import { saveVersion } from "./versions";

export type SaveState = { ok: boolean; savedAt: string | null; error: string | null };

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

export type ChapterInput = { title: string; notes_before: string; notes_after: string; body: string };
export type ChapterSaveResult = { ok: true; savedAt: string; words: number } | { ok: false; reason: "signed_out" | "error" };

/* Autosave. Never changes whether a chapter is published. Returns instead of redirecting when signed out,
   so the editor can keep the text on screen and say so. */
export async function saveChapter(chapterId: number, input: ChapterInput): Promise<ChapterSaveResult> {
  const db = await createSessionClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, reason: "signed_out" };
  const { body, word_count } = prepareChapter(input.body);
  const { data: current } = await db.from("chapters").select("body").eq("id", chapterId).maybeSingle();
  if (current && current.body !== body) await saveVersion(db, chapterId, "autosave");
  const { data, error } = await db.from("chapters").update({
    title: input.title.trim() || null,
    notes_before: notesToHtml(input.notes_before),
    notes_after: notesToHtml(input.notes_after),
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
    await saveVersion(db, chapterId, "publish");
    const { ficId, slug } = await publishChapterAt(db, chapterId, new Date());
    await afterPublish(ficId, slug);
    return { ok: true, status: "published", at: new Date().toISOString() };
  } catch (e) {
    return { ok: false, error: e instanceof NotReadyError ? e.message : "Couldn’t publish. Try again." };
  }
}

export type PublishChecksResult =
  | { ok: true; checks: Check[]; title: string; ratingLabel: string; adult: boolean }
  | { ok: false; error: string };

/* What the publish check dialog shows, read from what is saved. */
export async function getPublishChecks(ficId: number): Promise<PublishChecksResult> {
  const { db } = await requireAdmin();
  try {
    const { data: fic, error } = await db.from("fics").select("title, rating").eq("id", ficId).single();
    if (error) throw error;
    return {
      ok: true, checks: await loadStoryChecks(db, ficId), title: fic.title,
      ratingLabel: RATING_LABELS[fic.rating], adult: fic.rating === "mature" || fic.rating === "explicit",
    };
  } catch {
    return { ok: false, error: "Couldn’t check the story. Try again." };
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
    return { ok: false, error: e instanceof NotReadyError || (e instanceof Error && /future/.test(e.message)) ? (e as Error).message : "Couldn’t schedule. Try again." };
  }
}

export async function unpublish(chapterId: number): Promise<PublishResult> {
  const { db } = await requireAdmin();
  const { ficId, slug } = await unpublishChapter(db, chapterId);
  await afterPublish(ficId, slug);
  return { ok: true, status: "draft", at: null };
}

/* Paste HTML: cleans it into the allowed format and stores any embedded pictures as files. */
export async function convertPastedHtml(ficId: number, html: string): Promise<string> {
  const { db } = await requireAdmin();
  if (html.length > 4_000_000) return "";
  const withFiles = await extractDataUriImages(html, async (bytes) => {
    const stored = await storeImage(db, ficId, bytes);
    if (!stored.ok) throw new Error(stored.error);
    return stored.url;
  }).catch(() => html.replace(/<img\b[^>]*\bsrc="data:[^"]*"[^>]*>/gi, ""));
  return htmlToChapter(withFiles);
}

/* The Stories list's delete (one story or several). Permanent. */
export async function deleteStories(ids: number[]): Promise<DeleteResult> {
  const { db } = await requireAdmin();
  const res = await deleteStoriesCore(db, ids);
  if (res.ok) { refreshPublic(); revalidatePath("/admin"); revalidatePath("/admin/comments"); }
  return res;
}
