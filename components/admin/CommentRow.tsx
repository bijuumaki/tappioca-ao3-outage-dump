"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { replyToComment, setCommentHidden } from "@/lib/admin/comment-actions";
import type { AdminComment } from "@/lib/admin/comments";
import { formatDate } from "@/lib/format/dates";

export default function CommentRow({ c }: { c: AdminComment }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(null);
    const res = await replyToComment(c.id, reply).catch(() => ({ ok: false as const, error: "Something went wrong. Try again." }));
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setReply(""); setOpen(false);
    router.refresh();
  }

  async function toggleHidden() {
    setBusy(true); setError(null);
    const res = await setCommentHidden(c.id, !c.hidden).catch(() => ({ ok: false as const, error: "Something went wrong. Try again." }));
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    router.refresh();
  }

  return (
    <li className="a-comment" data-hidden={c.hidden}>
      <div className="a-comment-head">
        <span><Link href={`/admin/stories/${c.ficId}`} className="a-link">{c.storyTitle}</Link> · chapter {c.chapterPosition}</span>
        <span className="a-muted">{formatDate(c.createdAt)}</span>
      </div>
      <p className="a-comment-name">{c.name}{c.hidden && <span className="a-tag">Hidden</span>}</p>
      <p className="a-comment-body">{c.body}</p>
      {c.replies.map((r) => (
        <p key={r.id} className="a-comment-reply"><strong>You:</strong> {r.body}{r.hidden && <span className="a-tag">Hidden</span>}</p>
      ))}
      <div className="a-row">
        <button type="button" className="a-button" disabled={busy} onClick={() => void toggleHidden()}>{c.hidden ? "Show" : "Hide"}</button>
      </div>
      <details open={open} onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)} className="a-reply">
        <summary>Reply</summary>
        <form onSubmit={(e) => void send(e)} className="a-reply-form">
          <label className="a-field">Your reply
            <textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} />
          </label>
          <button type="submit" className="a-button-primary" disabled={busy}>Send reply</button>
        </form>
      </details>
      {error && <p className="a-alert" role="alert">{error}</p>}
    </li>
  );
}
