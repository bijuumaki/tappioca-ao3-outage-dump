"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/session";
import { checkUploadRequest } from "./upload-rules";
import { processUploadBatch, type UploadItem, type UploadResult } from "./upload-process";

export type UploadUrls = { ok: true; items: { name: string; path: string; token: string }[] } | { ok: false; error: string };

const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 120);

/* One-time addresses to send files straight to private storage (a server request can't carry big files on Vercel). */
export async function createUploadUrls(files: { name: string; size: number }[], ficId: number | null): Promise<UploadUrls> {
  const { db } = await requireAdmin();
  const problems = checkUploadRequest(files);
  if (problems.length) return { ok: false, error: problems.map((p) => p.message).join(" ") };
  const items: { name: string; path: string; token: string }[] = [];
  for (const f of files) {
    const path = `fics/${ficId ?? "new"}/${crypto.randomUUID()}-${safeName(f.name)}`;
    const { data, error } = await db.storage.from("uploads").createSignedUploadUrl(path);
    if (error || !data) return { ok: false, error: "Couldn’t start the upload. Try again." };
    items.push({ name: f.name, path, token: data.token });
  }
  return { ok: true, items };
}

/* Converts the files that were just sent. Only files this admin just uploaded to the expected folder are read. */
export async function processUploads(items: UploadItem[], ficId: number | null): Promise<{ results: UploadResult[] }> {
  const { db } = await requireAdmin();
  const prefix = `fics/${ficId ?? "new"}/`;
  const safe = items.filter((i) => i.path.startsWith(prefix) && !i.path.includes(".."));
  const { results } = await processUploadBatch(db, safe, ficId);
  revalidatePath("/admin");
  revalidatePath("/admin/uploads");
  revalidatePath("/");
  revalidatePath("/fics");
  return { results };
}
