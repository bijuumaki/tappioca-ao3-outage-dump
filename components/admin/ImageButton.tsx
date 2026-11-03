"use client";
import type { Editor } from "@tiptap/react";
import { useRef, useState } from "react";
import { uploadChapterImage } from "@/lib/admin/image-actions";
import { MAX_UPLOAD_BYTES, shrinkImage } from "@/lib/client/shrink-image";
import { ICONS } from "./EditorToolbar";

/* Toolbar button: pick a picture, shrink it in the browser, store it, put it in the chapter. */
export default function ImageButton({ editor, ficId }: { editor: Editor; ficId: number }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null); setBusy(true);
    try {
      const small = await shrinkImage(file);
      if (small.size > MAX_UPLOAD_BYTES) { setError("That picture is still over 4 MB after shrinking. Try a smaller one."); return; }
      const form = new FormData();
      form.set("image", small);
      const res = await uploadChapterImage(ficId, form);
      if (!res.ok) { setError(res.error); return; }
      editor.chain().focus().setImage({ src: res.url, alt: file.name.replace(/\.[^.]+$/, "") }).run();
    } catch {
      setError("The picture didn’t upload. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <button type="button" aria-label="Add picture" title="Add picture" disabled={busy} aria-busy={busy} onMouseDown={(e) => e.preventDefault()} onClick={() => input.current?.click()}>
        <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={ICONS.image} /></svg>
      </button>
      <input ref={input} data-image-input type="file" accept="image/*" hidden onChange={(e) => void pick(e.target.files?.[0])} />
      {busy && <span className="a-muted" role="status">Adding picture…</span>}
      {error && <span className="a-alert a-image-error" role="alert">{error}</span>}
    </>
  );
}
