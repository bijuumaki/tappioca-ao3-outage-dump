import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getChapter } from "@/lib/content/queries";
import { sendCommentAlert } from "@/lib/email/resend";
import type { Database } from "@/lib/supabase/database.types";
import { validateComment } from "./validate";

export type CommentFormState = { error: string; posted: boolean };
export type PostCommentInput = { slug: string; n: number; name: string; body: string; website?: string; ipHash: string };

const THROTTLE_MAX = 5;
const THROTTLE_WINDOW_SECONDS = 10 * 60;
const GENERIC = "Couldn’t post your comment. Try again.";

/* Runs `fn` without making the reader wait for it. On the server the action passes Next's `after`, so it finishes after the response. */
const fireAndForget = (fn: () => Promise<void>) => { void fn().catch(() => {}); };

/* Everything that decides whether a comment is stored. `db` must be the secret-key client: readers have no write access.
   It never throws: any failure comes back as a plain message. */
export async function postCommentCore(
  db: SupabaseClient<Database>,
  input: PostCommentInput,
  deps: { alert?: typeof sendCommentAlert; siteUrl?: string; schedule?: (fn: () => Promise<void>) => void } = {},
): Promise<CommentFormState> {
  try {
    const check = validateComment({ name: input.name, body: input.body, website: input.website });
    if (check.ok === "skip") return { error: "", posted: true };
    if (!check.ok) return { error: check.error, posted: false };

    /* Only chapters a reader can see (published, story published) take comments. */
    const found = await getChapter(input.slug, input.n);
    if (!found) return { error: "That chapter isn’t available.", posted: false };

    /* One database step checks the sender's recent comments and stores the comment, so parallel posts can't beat the limit. */
    const { data: id, error } = await db.rpc("post_comment", {
      p_chapter_id: found.chapter.id, p_name: check.name, p_body: check.body,
      p_ip_hash: input.ipHash, p_max: THROTTLE_MAX, p_window_seconds: THROTTLE_WINDOW_SECONDS,
    });
    if (error) return { error: GENERIC, posted: false };
    if (id === null) return { error: "Slow down a little and try again in a few minutes.", posted: false };

    const site = deps.siteUrl ?? process.env.SITE_URL ?? "https://tappiocarchive.vercel.app";
    (deps.schedule ?? fireAndForget)(() => (deps.alert ?? sendCommentAlert)({
      ficTitle: found.fic.title, chapterN: found.chapter.n, name: check.name, body: check.body,
      url: `${site}/fics/${input.slug}/${found.chapter.n}#comments-heading`,
    }));
    return { error: "", posted: true };
  } catch {
    return { error: GENERIC, posted: false };
  }
}
