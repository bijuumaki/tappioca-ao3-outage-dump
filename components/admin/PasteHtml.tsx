"use client";
import { useEffect, useRef, useState } from "react";
import { convertPastedHtml } from "@/lib/admin/actions";

/* Paste what Ellipsus's "Copy as HTML" (or Google Docs, Word…) gave you; see it cleaned; put it in the chapter. */
export default function PasteHtml({ ficId, onUse }: { ficId: number; onUse: (html: string, mode: "replace" | "append") => void | Promise<void> }) {
  const [raw, setRaw] = useState("");
  const [clean, setClean] = useState("");
  const [busy, setBusy] = useState(false);
  const latest = useRef(0);

  useEffect(() => {
    if (!raw.trim()) { latest.current++; setClean(""); setBusy(false); return; }
    setBusy(true);
    const t = setTimeout(() => {
      /* Only the newest request may show its result, so an older, slower reply can't overwrite a newer one. */
      const mine = ++latest.current;
      convertPastedHtml(ficId, raw)
        .then((html) => { if (mine === latest.current) setClean(html); })
        .catch(() => { if (mine === latest.current) setClean(""); })
        .finally(() => { if (mine === latest.current) setBusy(false); });
    }, 400);
    return () => clearTimeout(t);
  }, [raw, ficId]);

  const ready = !!clean && !busy;
  return (
    <details className="a-notes a-paste">
      <summary>Paste HTML</summary>
      <label className="a-field">HTML to paste
        <textarea aria-label="HTML to paste" rows={5} value={raw} onChange={(e) => setRaw(e.target.value)} placeholder="Paste the HTML here" />
      </label>
      {raw.trim() && (
        <div className="a-paste-preview rich-text" aria-live="polite" aria-label="Preview of the cleaned text" dangerouslySetInnerHTML={{ __html: clean || (busy ? "<p>Cleaning…</p>" : "<p>Nothing to show.</p>") }} />
      )}
      <div className="a-row">
        <button type="button" className="a-button-primary" disabled={!ready} onClick={() => { onUse(clean, "replace"); setRaw(""); setClean(""); }}>Use this</button>
        <button type="button" className="a-button" disabled={!ready} onClick={() => { onUse(clean, "append"); setRaw(""); setClean(""); }}>Add to the end</button>
      </div>
    </details>
  );
}
