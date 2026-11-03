"use server";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/supabase/session";
import { replyToCommentCore, setCommentHiddenCore, type CommentResult } from "./comments";

function refresh() {
  revalidatePath("/admin/comments");
  revalidatePath("/fics", "layout");
}

export async function replyToComment(parentId: number, body: string): Promise<CommentResult> {
  const { db } = await requireAdmin();
  const res = await replyToCommentCore(db, parentId, body);
  if (res.ok) refresh();
  return res;
}

export async function setCommentHidden(id: number, hidden: boolean): Promise<CommentResult> {
  const { db } = await requireAdmin();
  const res = await setCommentHiddenCore(db, id, hidden);
  if (res.ok) refresh();
  return res;
}
