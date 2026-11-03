"use server";
import { createHash } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSecretClient } from "@/lib/supabase/secret";
import { postCommentCore, type CommentFormState } from "./post";

/* The reader's comment form. The sender's address is only ever stored as a salted hash, to slow floods down. */
export async function postComment(_prev: CommentFormState, form: FormData): Promise<CommentFormState> {
  const text = (k: string) => String(form.get(k) ?? "");
  const slug = text("slug");
  const n = Number(text("n"));
  if (!/^[a-z0-9-]{1,200}$/.test(slug) || !Number.isInteger(n) || n < 1) return { error: "That chapter isn’t available.", posted: false };

  const h = await headers();
  const ip = (h.get("x-forwarded-for") ?? "").split(",")[0].trim() || h.get("x-real-ip") || "unknown";
  const salt = process.env.COMMENT_HASH_SALT ?? process.env.SUPABASE_SECRET_KEY ?? "";
  const ipHash = createHash("sha256").update(`${salt}:${ip}`).digest("hex");

  const res = await postCommentCore(createSecretClient(), { slug, n, name: text("name"), body: text("body"), website: text("website"), ipHash });
  if (res.posted) revalidatePath(`/fics/${slug}/${n}`);
  return res;
}
