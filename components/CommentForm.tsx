"use client";
import { useActionState, useEffect, useState } from "react";
import { postComment } from "@/lib/comments/actions";
import type { CommentFormState } from "@/lib/comments/post";

export default function CommentForm({ slug, n }: { slug: string; n: number }) {
  const [name, setName] = useState("");
  const [body, setBody] = useState("");
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  const [state, action, pending] = useActionState(async (prev: CommentFormState, form: FormData) => {
    const res = await postComment(prev, form).catch(() => ({ error: "Couldn’t post your comment. Try again.", posted: false }));
    if (res.posted) setBody("");
    return res;
  }, { error: "", posted: false });

  return (
    <form action={action} aria-label="Leave a comment" className="comment-form" data-ready={ready ? "" : undefined}>
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="n" value={n} />
      {/* A trap for bots: real readers never see or fill this. */}
      <div className="sr-only" aria-hidden="true">
        <label>Website<input type="text" name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label>Your name
        <input type="text" name="name" autoComplete="nickname" maxLength={200} value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>Your comment
        <textarea name="body" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      {state.error && <p role="alert" className="comment-error">{state.error}</p>}
      {state.posted && !state.error && <p role="status" className="comment-sent">Thank you. Your comment will show once the author has approved it.</p>}
      <button type="submit" className="story-primary comment-post" disabled={pending}>Post comment</button>
    </form>
  );
}
