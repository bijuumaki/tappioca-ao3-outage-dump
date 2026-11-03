"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import type { Mark } from "@/lib/notes/model";
import { deleteMark, liveMarks, NOTES_EVENT, upsertMark } from "@/lib/client/notes-store";

/* Everything this browser has highlighted, by story. Reads from the browser, so it is filled in after the page loads. */
export default function HighlightsList() {
  const [marks, setMarks] = useState<Mark[] | null>(null);

  useEffect(() => {
    const read = () => setMarks(liveMarks());
    read();
    window.addEventListener(NOTES_EVENT, read);
    return () => window.removeEventListener(NOTES_EVENT, read);
  }, []);

  if (marks === null) return <p className="empty-note" aria-busy="true">loading…</p>;
  if (marks.length === 0) {
    return <p className="empty-note">Nothing highlighted yet. Select words in a chapter to highlight them or add a note. Use “Sync across devices” in the Aa panel to keep them on all your devices.</p>;
  }

  const stories = new Map<string, Mark[]>();
  for (const m of [...marks].sort((a, b) => a.slug.localeCompare(b.slug) || a.n - b.n || a.start - b.start)) {
    stories.set(m.slug, [...(stories.get(m.slug) ?? []), m]);
  }

  return (
    <div className="hl-list">
      {[...stories.entries()].map(([slug, items]) => (
        <section key={slug} aria-labelledby={`hl-${slug}`}>
          <h2 className="section-bar keep-case" id={`hl-${slug}`}>{items[0].fic || slug}</h2>
          <ul>
            {items.map((m) => (
              <li key={m.id} className="hl-item">
                <p className="hl-where"><Link href={`/fics/${m.slug}/${m.n}#hl-${m.id}`}>{m.ch || `Chapter ${m.n}`}</Link></p>
                <blockquote className="hl-quote keep-case" data-color={m.color}>{m.quote}</blockquote>
                <label className="hl-note-label">
                  <span>Note</span>
                  <textarea className="keep-case" defaultValue={m.note} rows={2} maxLength={2000} placeholder="add a note"
                    onBlur={(e) => { if (e.target.value !== m.note) upsertMark({ ...m, note: e.target.value }); }} />
                </label>
                <button type="button" className="hl-text-btn hl-danger" onClick={() => deleteMark(m.id)}>Remove highlight</button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
