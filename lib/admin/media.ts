import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { sniffImage } from "@/lib/convert/images";
import { mediaUrl } from "@/lib/content/media";
import type { Database } from "@/lib/supabase/database.types";

export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export const NOT_AN_IMAGE = "That file isn’t a JPG, PNG, WebP, GIF or AVIF picture.";

export type StoredImage = { ok: true; url: string; path: string } | { ok: false; error: string };

/* Stores a picture for a story in the public "media" bucket. What it is comes from its bytes, never its name. */
export async function storeImage(db: SupabaseClient<Database>, ficId: number, bytes: Uint8Array): Promise<StoredImage> {
  const kind = sniffImage(bytes);
  if (!kind) return { ok: false, error: NOT_AN_IMAGE };
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: "That picture is over 8 MB." };
  const path = `fics/${ficId}/images/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${kind.ext}`;
  const up = await db.storage.from("media").upload(path, bytes, { contentType: kind.type });
  if (up.error) return { ok: false, error: "The picture didn’t upload. Try again." };
  return { ok: true, url: mediaUrl(path), path };
}
