"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { removeReaderMark } from "@/lib/admin/reader-mark-actions";
import type { ReaderMark } from "@/lib/admin/reader-marks";
import { formatDate } from "@/lib/format/dates";

export default function ReaderMarkRow({ m, showReader }: { m: ReaderMark; showReader: boolean }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function remove() {
    setBusy(true); setError("");
    const ok = await removeReaderMark(m.id).catch(() => false);
    setBusy(false);
    if (!ok) { setError("Couldn't remove it. Try again."); return; }
    router.refresh();
  }

  return (
    <li className="a-comment">
      <div className="a-comment-head">
        <span><span className="a-rx-swatch" data-color={m.color} aria-hidden="true" /> <a className="a-link" href={`/fics/${m.slug}/${m.n}`} target="_blank" rel="noreferrer">{m.fic || m.slug} · {m.ch || `chapter ${m.n}`}</a>{showReader && <> · <strong>{m.name}</strong></>}</span>
        <span className="a-muted">{formatDate(new Date(m.updated).toISOString())}</span>
      </div>
      <blockquote className="a-rx-quote">{m.quote}</blockquote>
      {m.note && <p className="a-comment-body">{m.note}</p>}
      {error && <p role="alert" className="a-alert">{error}</p>}
      <div className="a-row">
        {confirming
          ? <><button type="button" className="a-button-primary" disabled={busy} aria-busy={busy} onClick={remove}>Yes, remove</button><button type="button" className="a-button" onClick={() => setConfirming(false)}>Keep</button></>
          : <button type="button" className="a-button" onClick={() => setConfirming(true)}>Remove</button>}
      </div>
    </li>
  );
}
