"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteComment, replyToComment, setCommentHidden } from "@/lib/admin/comment-actions";
import type { AdminComment } from "@/lib/admin/comments";
import { formatDate } from "@/lib/format/dates";

export default function CommentRow({ c }: { c: AdminComment }) {
  const router = useRouter();
  const [reply, setReply] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState("");

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
    setNotice(c.hidden ? "Comment approved. It now shows under the chapter." : "Comment hidden. It is back in Waiting.");
    router.refresh();
  }

  async function remove() {
    setBusy(true); setError(null);
    const res = await deleteComment(c.id).catch(() => ({ ok: false as const, error: "Something went wrong. Try again." }));
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
      <p className="a-comment-name">{c.name} <span className="a-muted">{c.hidden ? "○ Waiting for approval" : "● Showing on the site"}</span></p>
      <p className="a-comment-body">{c.body}</p>
      {c.replies.map((r) => (
        <p key={r.id} className="a-comment-reply"><strong>You:</strong> {r.body}{r.hidden && <span className="a-tag">Hidden</span>}</p>
      ))}
      <div className="a-row">
        {c.hidden
          ? <button type="button" className="a-button-primary" disabled={busy} onClick={() => void toggleHidden()}>Approve</button>
          : <button type="button" className="a-button" disabled={busy} onClick={() => void toggleHidden()}>Hide from site</button>}
        <button type="button" className="a-button" disabled={busy} onClick={() => setConfirming(true)}>Delete</button>
      </div>
      {confirming && (
        <div role="alertdialog" aria-labelledby={`del-${c.id}`} className="a-confirm">
          <strong id={`del-${c.id}`}>Delete this comment?</strong>
          <span>This permanently removes the comment from {c.name}. It can’t be undone.</span>
          <div className="a-row">
            <button type="button" className="a-button" onClick={() => setConfirming(false)}>Keep comment</button>
            <button type="button" className="a-button-primary" disabled={busy} onClick={() => void remove()}>Delete comment</button>
          </div>
        </div>
      )}
      {notice && <p role="status" className="a-muted">{notice}</p>}
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
