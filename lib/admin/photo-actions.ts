"use server";
import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { sniffImage } from "@/lib/convert/images";
import { mediaUrl } from "@/lib/content/media";
import { normalizeFrame, parsePhoto, serializePhoto, type PhotoFrame } from "@/lib/content/photo";
import { createSessionClient } from "@/lib/supabase/session";
import { NOT_AN_IMAGE } from "./media";

export type PhotoResult = { ok: true; url: string; frame: PhotoFrame } | { ok: false; error: string };
const MAX_BYTES = 4 * 1024 * 1024;

/* The round photo on Home and About (field "photo"). Admin only (row-level security checks it again); what it is comes from its bytes. */
export async function uploadSitePhoto(form: FormData): Promise<PhotoResult> {
  const db = await createSessionClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, error: "Sign in again to change the photo." };
  const file = form.get("photo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: "Choose a picture first." };
  if (file.size > MAX_BYTES) return { ok: false, error: "That picture is over 4 MB. Try a smaller one." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, error: NOT_AN_IMAGE };
  const path = `site/photo-${createHash("sha256").update(bytes).digest("hex").slice(0, 24)}.${kind.ext}`;
  const up = await db.storage.from("media").upload(path, bytes, { contentType: kind.type, upsert: true });
  if (up.error) return { ok: false, error: "The picture didn’t upload. Try again." };
  const saved = await db.from("pages").upsert({ slug: "photo", title: "Photo", body: serializePhoto({ path, zoom: 1, x: 50, y: 50 }) }).select("slug");
  if (saved.error || !saved.data?.length) return { ok: false, error: "The picture uploaded but couldn’t be saved. Try again." };
  revalidatePath("/");
  revalidatePath("/about");
  return { ok: true, url: mediaUrl(path), frame: { path, zoom: 1, x: 50, y: 50 } };
}

/* How the picture sits in the circle: zoom (1 to 3) and the point kept in view (0 to 100 across and down). */
export async function savePhotoFrame(input: { zoom: number; x: number; y: number }): Promise<{ ok: boolean }> {
  const db = await createSessionClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false };
  const { data } = await db.from("pages").select("body").eq("slug", "photo").maybeSingle();
  const current = parsePhoto(data?.body);
  if (!current) return { ok: false };
  const next = normalizeFrame({ ...current, ...input });
  const saved = await db.from("pages").update({ body: serializePhoto(next) }).eq("slug", "photo").select("slug");
  if (saved.error || !saved.data?.length) return { ok: false };
  revalidatePath("/");
  revalidatePath("/about");
  return { ok: true };
}
