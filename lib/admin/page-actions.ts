"use server";
import { revalidatePath } from "next/cache";
import { sanitizeRichText } from "@/lib/richtext/allowlist";
import { PAGE_TEXTS, type PageSlug } from "./page-texts";
import { createSessionClient } from "@/lib/supabase/session";

export type PageSaveResult = { ok: true } | { ok: false; reason: "signed_out" | "error" };

/* Autosave for page texts. Returns instead of redirecting when signed out, so the text stays on screen. */
export async function savePageText(slug: PageSlug, html: string): Promise<PageSaveResult> {
  if (!PAGE_TEXTS.some((p) => p.slug === slug)) return { ok: false, reason: "error" };
  const db = await createSessionClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return { ok: false, reason: "signed_out" };
  const { data, error } = await db.from("pages").update({ body: sanitizeRichText(html) }).eq("slug", slug).select("slug");
  if (error) return { ok: false, reason: "error" };
  if (!data?.length) return { ok: false, reason: "signed_out" };
  revalidatePath("/");
  revalidatePath(`/${slug}`);
  return { ok: true };
}

/* Lets a public page ask "is Bijuu signed in?" so the editing tools show only for her. The pages themselves stay cached for readers. */
export async function amSignedInAsAdmin(): Promise<boolean> {
  const db = await createSessionClient();
  const { data: { user } } = await db.auth.getUser();
  if (!user) return false;
  const { data } = await db.from("admins").select("user_id").eq("user_id", user.id).maybeSingle();
  return !!data;
}
