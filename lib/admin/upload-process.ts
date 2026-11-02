import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ConvertError, convertFile, MAX_DOCUMENT_BYTES, type Converted } from "@/lib/convert";
import { groupFiles } from "@/lib/convert/names";
import type { Database } from "@/lib/supabase/database.types";
import { slugify } from "@/lib/text/slug";
import { prepareChapter } from "./chapter";
import { storeImage } from "./media";
import { parseTagInput, ratingFromText, uniqueSlug } from "./story-form";
import { setTags, takenSlugs } from "./story-store";
import { saveVersion } from "./versions";

type Db = SupabaseClient<Database>;
export type UploadItem = { name: string; path: string };
export type UploadResult = { name: string; ok: boolean; message: string; ficId?: number; chapterIds?: number[] };

const plain = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/\s+/g, " ").trim();

async function addChapters(db: Db, ficId: number, chapters: Converted["chapters"], n: number | null): Promise<{ ids: number[]; live: number[] }> {
  let position = n;
  if (position === null) {
    const { data: last } = await db.from("chapters").select("position").eq("fic_id", ficId).order("position", { ascending: false }).limit(1).maybeSingle();
    position = (last?.position ?? 0) + 1;
  }
  const ids: number[] = [];
  const live: number[] = [];
  for (const ch of chapters) {
    const { body, word_count } = prepareChapter(ch.html);
    const { data: existing } = await db.from("chapters").select("id, title, publish_at").eq("fic_id", ficId).eq("position", position).maybeSingle();
    if (existing) {
      /* If the old text can't be kept as a version, leave the chapter as it is rather than lose it. */
      if ((await saveVersion(db, existing.id, "upload")) === "error") throw new ConvertError(`Couldn’t keep a copy of the old text of chapter ${position}, so I left it as it was. Try again.`);
      if (existing.publish_at && Date.parse(existing.publish_at) <= Date.now()) live.push(position);
      const { error } = await db.from("chapters").update({ body, word_count, title: ch.title ?? existing.title }).eq("id", existing.id);
      if (error) throw error;
      ids.push(existing.id);
    } else {
      const { data, error } = await db.from("chapters").insert({ fic_id: ficId, position, title: ch.title ?? null, body, word_count }).select("id").single();
      if (error) throw error;
      ids.push(data.id);
    }
    position++;
  }
  return { ids, live };
}

async function applyDetails(db: Db, ficId: number, c: Converted) {
  const meta = c.meta ?? {};
  const title = (c.title ?? "").trim();
  const patch: Database["public"]["Tables"]["fics"]["Update"] = {};
  if (title) { patch.title = title; patch.slug = uniqueSlug(slugify(title), await takenSlugs(db, ficId)); }
  if (c.summary) patch.summary = plain(c.summary);
  const rating = ratingFromText(meta.rating);
  if (rating) patch.rating = rating;
  if (Object.keys(patch).length) await db.from("fics").update(patch).eq("id", ficId);
  await setTags(db, ficId, {
    ...(meta.fandom ? { fandom: parseTagInput(meta.fandom).slice(0, 1) } : {}),
    ...(meta.relationships ? { relationship: parseTagInput(meta.relationships) } : {}),
    ...(meta.characters ? { character: parseTagInput(meta.characters) } : {}),
    ...(meta.warnings ? { warning: parseTagInput(meta.warnings) } : {}),
    ...(meta.tags ? { freeform: parseTagInput(meta.tags) } : {}),
  });
}

/* Converts uploaded files into draft chapters. Files named "Title - N" go together as chapters of one fic; into an
   existing fic (ficId) they become its chapters, replacing the text of a chapter number that already exists (after
   keeping the old text as a version). One file failing never stops the others. */
export async function processUploadBatch(db: Db, items: UploadItem[], ficId: number | null): Promise<{ results: UploadResult[] }> {
  const results: UploadResult[] = [];
  const byName = new Map(items.map((i) => [i.name, i]));

  for (const group of groupFiles(items.map((i) => i.name))) {
    let target = ficId;
    let created = false;
    if (target === null) {
      let data: { id: number } | null = null;
      try {
        const { data: cat } = await db.from("categories").select("id").eq("slug", "fic").single();
        const slug = uniqueSlug(slugify(group.title), await takenSlugs(db));
        const ins = await db.from("fics").insert({ slug, title: group.title, category_id: cat!.id }).select("id").single();
        data = ins.error ? null : ins.data;
      } catch { data = null; }
      if (!data) {
        for (const f of group.files) results.push({ name: f.name, ok: false, message: "Couldn’t start a new fic for this file. Try again." });
        continue;
      }
      target = data.id; created = true;
    }
    const ficTarget = target;
    let detailsApplied = false;
    let successes = 0;

    for (const file of group.files) {
      const item = byName.get(file.name)!;
      try {
        const { data: blob, error } = await db.storage.from("uploads").download(item.path);
        if (error || !blob) throw new ConvertError(`“${item.name}” didn’t arrive. Try uploading it again.`);
        if (blob.size > MAX_DOCUMENT_BYTES) throw new ConvertError(`“${item.name}” is over 25 MB.`);
        const buffer = await blob.arrayBuffer();
        const converted = await convertFile(item.name, buffer, async (bytes) => {
          const stored = await storeImage(db, ficTarget, bytes);
          if (!stored.ok) throw new Error(stored.error);
          return stored.url;
        });
        const { ids, live } = await addChapters(db, ficTarget, converted.chapters, file.n);
        if (created && !detailsApplied) { await applyDetails(db, ficTarget, converted); detailsApplied = true; }
        await db.from("upload_files").insert({ fic_id: ficTarget, chapter_id: ids[0] ?? null, filename: item.name, storage_path: item.path, kind: item.name.split(".").pop()!.toLowerCase(), size: buffer.byteLength, status: "converted" });
        successes++;
        results.push({ name: item.name, ok: true, message: (ids.length === 1 ? "converted to 1 chapter" : `converted to ${ids.length} chapters`)
          + (live.length ? ` (chapter ${live.join(", ")} ${live.length === 1 ? "is" : "are"} published, so readers see the new text right away; the old text is kept as a version)` : ""), ficId: ficTarget, chapterIds: ids });
      } catch (e) {
        const message = e instanceof ConvertError ? e.message : "Something went wrong with this file. Try again.";
        await db.from("upload_files").insert({ fic_id: created ? null : ficTarget, filename: item.name, storage_path: item.path, kind: item.name.split(".").pop()?.toLowerCase() ?? "", size: 0, status: "failed", error: message });
        await db.storage.from("uploads").remove([item.path]);
        results.push({ name: item.name, ok: false, message: `couldn’t convert: ${message}` });
      }
    }

    if (created && successes === 0) {
      const { data: imgs } = await db.storage.from("media").list(`fics/${ficTarget}/images`, { limit: 1000 });
      if (imgs?.length) await db.storage.from("media").remove(imgs.map((f) => `fics/${ficTarget}/images/${f.name}`));
      await db.from("fics").delete().eq("id", ficTarget);
    }
  }
  /* results in the order the files were given */
  const order = new Map(items.map((i, n) => [i.name, n]));
  results.sort((a, b) => (order.get(a.name) ?? 0) - (order.get(b.name) ?? 0));
  return { results };
}
