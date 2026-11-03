"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { HL_COLORS, LIMITS, type HlColor, type Mark } from "@/lib/notes/model";
import { addMark, deleteMark, marksFor, NOTES_EVENT, upsertMark } from "@/lib/client/notes-store";
import { locate, offsetAtPoint, offsetOf, paint, rangeAt } from "@/lib/client/notes-dom";

type Pick = { start: number; end: number; quote: string };
const COLOR_NAMES: Record<HlColor, string> = { yellow: "Yellow", pink: "Pink", green: "Green", blue: "Blue" };

function Dots({ value, onPick }: { value?: HlColor; onPick: (c: HlColor) => void }) {
  return (
    <span className="hl-dots" role="group" aria-label="Highlight color">
      {HL_COLORS.map((c) => (
        <button key={c} type="button" className="hl-dot" data-color={c} aria-label={`${COLOR_NAMES[c]} highlight`} aria-pressed={value === c} onClick={() => onPick(c)} />
      ))}
    </span>
  );
}

/* Select words in the chapter to highlight them or add a note; tap a highlight to change it. Saved in this browser, and
   synced if the reader turned sync on in the Aa panel. */
export default function ChapterHighlights({ slug, n, fic, ch }: { slug: string; n: number; fic: string; ch: string }) {
  const [picked, setPicked] = useState<Pick | null>(null);
  const [editing, setEditing] = useState<Mark | null>(null);
  const [draft, setDraft] = useState("");
  const rootRef = useRef<HTMLElement | null>(null);

  const repaint = useCallback(() => {
    const root = rootRef.current;
    if (root) paint(root, marksFor(slug, n));
  }, [slug, n]);

  useEffect(() => {
    rootRef.current = document.querySelector<HTMLElement>(".chapter-text");
    repaint();
    const onChange = () => { repaint(); setEditing((e) => (e ? marksFor(slug, n).find((m) => m.id === e.id) ?? null : null)); };
    window.addEventListener(NOTES_EVENT, onChange);
    const hash = window.location.hash.match(/^#hl-([a-z0-9]+)$/);
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (hash) {
      timer = setTimeout(() => {
        const m = marksFor(slug, n).find((x) => x.id === hash[1]);
        const root = rootRef.current;
        const at = m && root && locate(root.textContent ?? "", m);
        const r = at && root && rangeAt(root, at.start, at.end);
        if (r) {
          const y = r.getBoundingClientRect().top + window.scrollY - window.innerHeight * 0.3;
          window.scrollTo({ top: Math.max(0, y) });
          setEditing(m);
          setDraft(m.note);
        }
      }, 400);
    }
    return () => { window.removeEventListener(NOTES_EVENT, onChange); if (timer) clearTimeout(timer); };
  }, [repaint, slug, n]);

  /* Text selection, and tapping an existing highlight. Copying is still blocked: selecting is only for highlighting. */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onSelect = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) { setPicked(null); return; }
        const r = sel.getRangeAt(0);
        if (!root.contains(r.startContainer) || !root.contains(r.endContainer)) { setPicked(null); return; }
        const start = offsetOf(root, r.startContainer, r.startOffset);
        const end = offsetOf(root, r.endContainer, r.endOffset);
        const quote = (root.textContent ?? "").slice(start, end);
        if (end <= start || !quote.trim()) { setPicked(null); return; }
        setPicked({ start, end, quote: quote.slice(0, LIMITS.quote) });
        setEditing(null);
      }, 120);
    };
    const onClick = (e: MouseEvent) => {
      const sel = window.getSelection();
      if (sel && !sel.isCollapsed) return;
      const off = offsetAtPoint(root, e.clientX, e.clientY);
      if (off === null) return;
      const text = root.textContent ?? "";
      const hit = marksFor(slug, n)
        .map((m) => ({ m, at: locate(text, m) }))
        .filter((x) => x.at && x.at.start <= off && off < x.at.end)
        .sort((a, b) => (a.at!.end - a.at!.start) - (b.at!.end - b.at!.start))[0];
      if (hit) { setEditing(hit.m); setDraft(hit.m.note); setPicked(null); }
    };
    const block = (e: Event) => e.preventDefault();
    document.addEventListener("selectionchange", onSelect);
    root.addEventListener("click", onClick);
    root.addEventListener("copy", block);
    root.addEventListener("cut", block);
    root.addEventListener("dragstart", block);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("selectionchange", onSelect);
      root.removeEventListener("click", onClick);
      root.removeEventListener("copy", block);
      root.removeEventListener("cut", block);
      root.removeEventListener("dragstart", block);
    };
  }, [slug, n]);

  useEffect(() => {
    if (!editing && !picked) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setEditing(null); setPicked(null); window.getSelection()?.removeAllRanges(); } };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [editing, picked]);

  function create(color: HlColor, withNote: boolean) {
    if (!picked) return;
    const mark = addMark({ slug, n, start: picked.start, end: picked.end, quote: picked.quote, fic, ch }, color);
    window.getSelection()?.removeAllRanges();
    setPicked(null);
    if (withNote) { setEditing(mark); setDraft(""); }
  }
  function saveNote() {
    if (editing && draft !== editing.note) upsertMark({ ...editing, note: draft });
  }
  function close() { saveNote(); setEditing(null); }

  if (picked) {
    return (
      <div className="hl-bar" role="toolbar" aria-label="Highlight the selected text">
        <Dots onPick={(c) => create(c, false)} />
        <button type="button" className="hl-text-btn" onClick={() => create("yellow", true)}>Add note</button>
      </div>
    );
  }
  if (editing) {
    return (
      <div className="hl-bar hl-editor" role="dialog" aria-label="Highlight">
        <p className="hl-quote keep-case">“{editing.quote.length > 140 ? `${editing.quote.slice(0, 140)}…` : editing.quote}”</p>
        <Dots value={editing.color} onPick={(c) => { upsertMark({ ...editing, color: c, note: draft }); }} />
        <label className="hl-note-label">
          <span>Note</span>
          <textarea className="keep-case" value={draft} maxLength={LIMITS.note} rows={3} onChange={(e) => setDraft(e.target.value)} onBlur={saveNote} placeholder="write a note (only you can see it)" />
        </label>
        <div className="hl-actions">
          <button type="button" className="hl-text-btn" onClick={close}>Done</button>
          <button type="button" className="hl-text-btn hl-danger" onClick={() => { deleteMark(editing.id); setEditing(null); }}>Remove highlight</button>
        </div>
      </div>
    );
  }
  return null;
}
