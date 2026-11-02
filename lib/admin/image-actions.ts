"use server";
import { requireAdmin } from "@/lib/supabase/session";
import { storeImage } from "./media";

export type ImageResult = { ok: true; url: string } | { ok: false; error: string };

/* One picture for the chapter being written (field "image"). Admin only; what it is comes from its bytes. */
export async function uploadChapterImage(ficId: number, form: FormData): Promise<ImageResult> {
  const { db } = await requireAdmin();
  const file = form.get("image");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a picture first." };
  const stored = await storeImage(db, ficId, new Uint8Array(await file.arrayBuffer()));
  return stored.ok ? { ok: true, url: stored.url } : { ok: false, error: stored.error };
}
