"use client";
import { useEffect, useRef, type RefObject } from "react";
import { missingCount, type Check } from "@/lib/admin/readiness";

/* The "are you sure" step before a story goes public. It lists the basics and blocks Publish until they are there. */
export default function PublishCheck({ checks, title, busy, returnFocus, onKeepEditing, onSaveDraft, onPublish }: {
  checks: Check[]; title: string; busy: boolean; returnFocus: RefObject<HTMLElement | null>;
  onKeepEditing(): void; onSaveDraft(): void; onPublish(): void;
}) {
  const box = useRef<HTMLDivElement>(null);
  const todo = missingCount(checks);
  const keepEditing = useRef(onKeepEditing);
  keepEditing.current = onKeepEditing;

  useEffect(() => {
    box.current?.querySelector<HTMLElement>("button:not(:disabled)")?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); keepEditing.current(); return; }
      if (e.key !== "Tab" || !box.current) return;
      const items = [...box.current.querySelectorAll<HTMLElement>("button:not(:disabled)")];
      if (!items.length) return;
      const first = items[0], last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); returnFocus.current?.focus(); };
  }, [returnFocus]);

  const heading = todo > 0 ? (todo === 1 ? "1 thing to fix before publishing" : `${todo} things to fix before publishing`) : `Publish “${title}”?`;
  const body = todo > 0 ? "Fix these to publish. You can still save a draft." : "Readers will see this story on the fic list as soon as you publish.";

  return (
    <div className="a-modal-back">
      <div ref={box} role="dialog" aria-modal="true" aria-labelledby="pub-title" aria-describedby="pub-body" className="a-modal">
        <h2 id="pub-title">{heading}</h2>
        <p id="pub-body">{body}</p>
        <ul className="a-checks">
          {checks.map((c) => (
            <li key={c.key}>
              <span aria-hidden="true" className="a-check-mark" data-ok={c.ok}>{c.ok ? "✓" : "!"}</span>
              <span className="a-check-text">
                <span className="a-check-label">{c.label}<span className="sr-only">, {c.ok ? "done" : "needs attention"}</span></span>
                <span className="a-check-note">{c.note}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className="a-row a-modal-actions">
          <button type="button" className="a-button" onClick={onKeepEditing}>Keep editing</button>
          <button type="button" className="a-button" onClick={onSaveDraft}>Save as draft</button>
          <button type="button" className="a-button-primary" disabled={todo > 0 || busy} onClick={onPublish}>Publish story</button>
        </div>
      </div>
    </div>
  );
}
