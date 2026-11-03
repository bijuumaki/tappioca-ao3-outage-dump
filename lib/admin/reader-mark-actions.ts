"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/session";

/* Removes one shared highlight from the admin view (spam, or something that shouldn't be kept). It stays in that reader's browser. */
export async function removeReaderMark(id: string): Promise<boolean> {
  const { db } = await requireAdmin();
  if (!/^[a-z0-9]{6,32}$/.test(id)) return false;
  const { error } = await db.from("reader_marks").delete().eq("id", id);
  if (error) return false;
  revalidatePath("/admin/reader-experience");
  return true;
}
