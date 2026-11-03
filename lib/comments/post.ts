import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getChapter } from "@/lib/content/queries";
import { sendCommentAlert } from "@/lib/email/resend";
import type { Database } from "@/lib/supabase/database.types";
import { validateComment } from "./validate";

export type CommentFormState = { error: string; posted: boolean };
export type PostCommentInput = { slug: string; n: number; name: string; body: string; website?: string; ipHash: string };

const THROTTLE_MAX = 5;
const THROTTLE_WINDOW_MS = 10 * 60 * 1000;

/* Everything that decides whether a comment is stored. `db` must be the secret-key client: readers have no write access. */
export async function postCommentCore(
  db: SupabaseClient<Database>,
  input: PostCommentInput,
  deps: { alert?: typeof sendCommentAlert; siteUrl?: string } = {},
): Promise<CommentFormState> {
  const check = validateComment({ name: input.name, body: input.body, website: input.website });
  if (check.ok === "skip") return { error: "", posted: true };
  if (!check.ok) return { error: check.error, posted: false };

  /* Only chapters a reader can see (published, story published) take comments. */
  const found = await getChapter(input.slug, input.n);
  if (!found) return { error: "That chapter isn’t available.", posted: false };

  const since = new Date(Date.now() - THROTTLE_WINDOW_MS).toISOString();
  const { count, error: ce } = await db.from("comment_meta").select("comment_id", { count: "exact", head: true }).eq("ip_hash", input.ipHash).gte("created_at", since);
  if (ce) return { error: "Couldn’t post your comment. Try again.", posted: false };
  if ((count ?? 0) >= THROTTLE_MAX) return { error: "Slow down a little and try again in a few minutes.", posted: false };

  const { data: row, error } = await db.from("comments").insert({ chapter_id: found.chapter.id, name: check.name, body: check.body }).select("id").single();
  if (error) return { error: "Couldn’t post your comment. Try again.", posted: false };
  await db.from("comment_meta").insert({ comment_id: row.id, ip_hash: input.ipHash });

  const site = deps.siteUrl ?? process.env.SITE_URL ?? "https://tappiocarchive.vercel.app";
  try {
    await (deps.alert ?? sendCommentAlert)({
      ficTitle: found.fic.title, chapterN: found.chapter.n, name: check.name, body: check.body,
      url: `${site}/fics/${input.slug}/${found.chapter.n}#comments-heading`,
    });
  } catch { /* a failing email never stops a comment */ }
  return { error: "", posted: true };
}
