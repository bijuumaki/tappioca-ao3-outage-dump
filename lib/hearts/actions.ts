"use server";
import { revalidatePath } from "next/cache";
import { createSecretClient } from "@/lib/supabase/secret";

/* Hearts a story (+1) or takes the heart back (-1). Returns the new shared count, or null when the story isn't public.
   Whether this browser has already hearted is remembered in the browser, so there are no accounts. */
export async function setHeart(slug: string, on: boolean): Promise<number | null> {
  if (!/^[a-z0-9-]{1,200}$/.test(slug)) return null;
  try {
    const { data, error } = await createSecretClient().rpc("heart_fic", { p_slug: slug, p_delta: on ? 1 : -1 });
    if (error) return null;
    revalidatePath("/", "layout");
    return data;
  } catch {
    return null;
  }
}
