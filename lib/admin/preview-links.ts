"use server";
import { headers } from "next/headers";
import { requireAdmin } from "@/lib/supabase/session";

export type PreviewLink = { token: string; url: string; createdAt: string };

async function origin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function listPreviewLinks(chapterId: number): Promise<PreviewLink[]> {
  const { db } = await requireAdmin();
  const base = await origin();
  const { data } = await db.from("preview_links").select("token, created_at").eq("chapter_id", chapterId).is("revoked_at", null).order("created_at", { ascending: false });
  return (data ?? []).map((l) => ({ token: l.token, url: `${base}/preview/${l.token}`, createdAt: l.created_at }));
}

/* A secret address that shows this one chapter to anyone who has it, until it is revoked. */
export async function createPreviewLink(chapterId: number): Promise<PreviewLink | null> {
  const { db } = await requireAdmin();
  const { data, error } = await db.from("preview_links").insert({ chapter_id: chapterId }).select("token, created_at").single();
  if (error || !data) return null;
  return { token: data.token, url: `${await origin()}/preview/${data.token}`, createdAt: data.created_at };
}

export async function revokePreviewLink(token: string): Promise<void> {
  const { db } = await requireAdmin();
  await db.from("preview_links").update({ revoked_at: new Date().toISOString() }).eq("token", token).is("revoked_at", null);
}
