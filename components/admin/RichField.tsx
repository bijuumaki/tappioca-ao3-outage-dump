"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { editorExtensions } from "@/lib/admin/editor-extensions";
import { savePageText } from "@/lib/admin/page-actions";
import type { PageSlug } from "@/lib/admin/page-texts";
import EditorToolbar from "./EditorToolbar";

type State = "idle" | "saving" | "saved" | "signed_out" | "error";
const LABEL: Record<State, string> = { idle: "", saving: "Saving…", saved: "Saved", signed_out: "Not saved: sign in again", error: "Not saved: try again in a moment" };

/* A small editor for one page text. Autosaves 2 seconds after typing stops. */
export default function RichField({ slug, label, hint, initial }: { slug: PageSlug; label: string; hint: string; initial: string }) {
  const [state, setState] = useState<State>("idle");
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    content: initial,
    editorProps: { attributes: { class: "a-prose rich-text", "aria-label": label } },
    onUpdate: () => { dirty.current = true; setState("idle"); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => void save(), 2000); },
  });

  const save = useCallback(async () => {
    if (!editor || !dirty.current) return;
    dirty.current = false;
    setState("saving");
    const res = await savePageText(slug, editor.getHTML()).catch(() => ({ ok: false as const, reason: "error" as const }));
    if (res.ok) setState("saved"); else { dirty.current = true; setState(res.reason); }
  }, [editor, slug]);

  useEffect(() => {
    const flush = () => { if (dirty.current) void save(); };
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", warn);
    return () => { window.removeEventListener("pagehide", flush); window.removeEventListener("beforeunload", warn); flush(); };
  }, [save]);

  return (
    <section className="a-section" data-page={slug} aria-label={label}>
      <h2 className="a-bar">{label}</h2>
      <p className="a-muted">{hint}</p>
      {editor ? <EditorToolbar editor={editor} /> : <p className="a-muted">Loading…</p>}
      <div className="a-writing a-page-field"><EditorContent editor={editor} /></div>
      <span className="a-save-state" role="status" data-state={state}>{LABEL[state]}</span>
    </section>
  );
}
