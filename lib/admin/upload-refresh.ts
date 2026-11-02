import "server-only";
import { revalidatePath } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import type { UploadResult } from "./upload-process";

/* After files become chapters: refresh the admin lists, and the public pages of any fic that changed. */
export async function refreshAfterUpload(db: SupabaseClient<Database>, results: UploadResult[]): Promise<void> {
  for (const id of new Set(results.filter((r) => r.ok && r.ficId).map((r) => r.ficId!))) {
    const { data: fic } = await db.from("fics").select("slug").eq("id", id).maybeSingle();
    if (fic) revalidatePath(`/fics/${fic.slug}`, "layout");
  }
  revalidatePath("/admin");
  revalidatePath("/admin/uploads");
  revalidatePath("/");
  revalidatePath("/fics");
}
