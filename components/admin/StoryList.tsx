"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { deleteStories } from "@/lib/admin/actions";
import type { AdminStoryRow } from "@/lib/admin/queries";
import type { StoryStatus } from "@/lib/admin/status";
import { RATING_LABELS } from "@/lib/content/types";
import { formatDate } from "@/lib/format/dates";

const STATUS_LABEL: Record<StoryStatus, string> = { published: "Published", scheduled: "Scheduled", draft: "Draft" };
const word = (n: number) => (n === 1 ? "story" : "stories");

function TrashIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" /><path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" />
    </svg>
  );
}

/* The stories table with the canvas's selecting and deleting: tick rows, a bar says how many, delete asks first. */
export default function StoryList({ rows }: { rows: AdminStoryRow[] }) {
  const router = useRouter();
  const [sel, setSel] = useState<number[]>([]);
  const [doomed, setDoomed] = useState<number[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const keep = useRef<HTMLButtonElement>(null);

  const shown = rows.map((r) => r.id);
  const selShown = sel.filter((id) => shown.includes(id));
  const allOn = shown.length > 0 && selShown.length === shown.length;
  const toggle = (id: number) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const victims = rows.filter((r) => doomed?.includes(r.id));
  const published = victims.filter((r) => r.status === "published").length;

  useEffect(() => {
    if (!doomed) return;
    keep.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setDoomed(null); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doomed]);

  async function confirmDelete() {
    if (!doomed) return;
    setBusy(true); setError("");
    const res = await deleteStories(doomed).catch(() => ({ ok: false as const, error: "Something went wrong. Try again." }));
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setSel((s) => s.filter((id) => !doomed.includes(id)));
    setNotice(`${res.count} ${word(res.count)} deleted.`);
    setDoomed(null);
    router.refresh();
  }

  return (
    <>
      {notice && <p role="status" className="a-notice">{notice}</p>}
      {selShown.length > 0 && (
        <div className="a-selbar" role="group" aria-label="Selected stories">
          <span aria-live="polite" className="a-selcount">{selShown.length} selected</span>
          <button type="button" className="a-button" onClick={() => setSel([])}>Clear</button>
          <button type="button" className="a-button-danger" onClick={() => { setError(""); setDoomed(selShown); }}>Delete {selShown.length} {word(selShown.length)}</button>
        </div>
      )}
      <section aria-label="Your stories" className="a-table">
        <div className="a-story-head">
          <span className="a-check-cell"><input type="checkbox" aria-label="Select all stories shown" checked={allOn} onChange={() => setSel(allOn ? [] : shown)} /></span>
          <span aria-hidden="true">Story</span><span aria-hidden="true">Rating</span><span className="a-num" aria-hidden="true">Chapters</span><span className="a-num" aria-hidden="true">Words</span><span aria-hidden="true">Status</span><span aria-hidden="true">Updated</span><span />
        </div>
        <ul>
          {rows.map((s) => (
            <li key={s.id} className="a-story" data-selected={sel.includes(s.id) || undefined}>
              <span className="a-check-cell"><input type="checkbox" aria-label={`Select ${s.title}`} checked={sel.includes(s.id)} onChange={() => toggle(s.id)} /></span>
              <div className="a-story-title">
                <Link href={`/admin/stories/${s.id}`} className="keep-case">{s.title}</Link>
                {s.fandom && <div className="a-muted">{s.fandom}</div>}
              </div>
              <span className="a-cell">{RATING_LABELS[s.rating]}</span>
              <span className="a-cell a-num"><span className="a-phone-label">chapters: </span>{s.chapters}</span>
              <span className="a-cell a-num"><span className="a-phone-label">words: </span>{s.words.toLocaleString("en-US")}</span>
              <span className="a-cell a-status" data-status={s.status}><span className="a-dot" aria-hidden="true" />{STATUS_LABEL[s.status]}</span>
              <span className="a-cell a-muted">{formatDate(s.updatedAt)}</span>
              <span className="a-actions">
                <Link href={`/admin/stories/${s.id}`} className="a-link">Edit</Link>
                {s.status === "published" && <Link href={`/fics/${s.slug}`} className="a-link">View</Link>}
                <button type="button" className="a-icon-button" aria-label={`Delete ${s.title}`} title="Delete" onClick={() => { setError(""); setDoomed([s.id]); }}><TrashIcon /></button>
              </span>
            </li>
          ))}
        </ul>
      </section>
      {doomed && victims.length > 0 && (
        <div className="a-overlay">
          <div role="alertdialog" aria-modal="true" aria-labelledby="del-title" aria-describedby="del-body" className="a-dialog">
            <h2 id="del-title" className="a-dialog-title keep-case">{victims.length === 1 ? `Delete “${victims[0].title}”?` : `Delete ${victims.length} stories?`}</h2>
            <p id="del-body">
              This permanently removes {victims.length === 1 ? "the story" : "these stories"}, every chapter and all comments.
              {published > 0 && ` ${published} published ${word(published)} will disappear from the site.`} This can’t be undone.
            </p>
            {error && <p role="alert" className="a-alert">{error}</p>}
            <div className="a-dialog-actions">
              <button ref={keep} type="button" className="a-button" onClick={() => setDoomed(null)}>Keep {victims.length === 1 ? "story" : "stories"}</button>
              <button type="button" className="a-button-danger" disabled={busy} onClick={() => void confirmDelete()}>Delete {victims.length === 1 ? "story" : `${victims.length} stories`}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
