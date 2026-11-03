"use client";
import { EditorContent, useEditor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveChapter, type ChapterInput } from "@/lib/admin/actions";
import { editorExtensions } from "@/lib/admin/editor-extensions";
import EditorMenu from "./EditorMenu";
import EditorToolbar from "./EditorToolbar";
import ImageButton from "./ImageButton";
import PasteHtml from "./PasteHtml";
import PreviewLinks from "./PreviewLinks";
import PublishBar from "./PublishBar";
import { snapshotChapter } from "@/lib/admin/version-actions";
import VersionsPanel from "./VersionsPanel";
import { loadWebFont, readPref, writePref } from "@/lib/client/prefs";
import { countWords } from "@/lib/text/words";

type SaveState = "idle" | "saving" | "saved" | "signed_out" | "error";
const SAVE_LABEL: Record<SaveState, string> = {
  idle: "", saving: "Saving…", saved: "Saved", signed_out: "Not saved: sign in again", error: "Not saved: try again in a moment",
};
const FONT_STACKS: Record<string, string> = {
  default: "var(--font-body)", lucida: "var(--stack-lucida)", cantarell: "var(--stack-cantarell)",
  crimson: "var(--stack-crimson)", cormorant: "var(--stack-cormorant)",
};


export default function Editor({ chapterId, ficId, initial, publishAt }: { chapterId: number; ficId: number; initial: ChapterInput; publishAt: string | null }) {
  const [title, setTitle] = useState(initial.title);
  const [notesBefore, setNotesBefore] = useState(initial.notes_before);
  const [notesAfter, setNotesAfter] = useState(initial.notes_after);
  const [state, setState] = useState<SaveState>("idle");
  const [words, setWords] = useState(countWords(initial.body));
  const [font, setFont] = useState("default");
  const [size, setSize] = useState(16);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dirty = useRef(false);
  const [restored, setRestored] = useState(false);
  const backupKey = `fic-admin-draft-${chapterId}`;

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    content: initial.body,
    editorProps: { attributes: { class: "a-prose rich-text", "aria-label": "Chapter text" } },
    onUpdate: ({ editor: e }) => { setWords(countWords(e.getHTML())); schedule(); },
  });

  const fields = useRef({ title, notesBefore, notesAfter });
  fields.current = { title, notesBefore, notesAfter };

  const inFlight = useRef<Promise<boolean> | null>(null);
  const save = useCallback(async (force = false): Promise<boolean> => {
    if (inFlight.current) {
      const ok = await inFlight.current;
      if (!dirty.current && !force) return ok;
    }
    if (!editor || (!dirty.current && !force)) return true;
    dirty.current = false;
    setState("saving");
    const pending = saveChapter(chapterId, {
      title: fields.current.title, notes_before: fields.current.notesBefore, notes_after: fields.current.notesAfter, body: editor.getHTML(),
    }).catch(() => ({ ok: false as const, reason: "error" as const }));
    const run = pending.then(() => true, () => false);
    inFlight.current = run;
    const res = await pending;
    if (inFlight.current === run) inFlight.current = null;
    if (res.ok) {
      setState("saved");
      if (!dirty.current) { try { localStorage.removeItem(backupKey); } catch { /* storage blocked */ } }
      return true;
    }
    dirty.current = true;
    setState(res.reason);
    return false;
  }, [chapterId, editor, backupKey]);

  /* Every change is also kept in this browser until the server has it, so a lost sign-in or a crash loses nothing. */
  const backup = useCallback(() => {
    if (!editor) return;
    try {
      localStorage.setItem(backupKey, JSON.stringify({ ...fields.current, body: editor.getHTML(), at: Date.now() }));
    } catch { /* storage blocked */ }
  }, [editor, backupKey]);

  const schedule = useCallback(() => {
    dirty.current = true;
    queueMicrotask(backup);
    setState("idle");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), 3000);
  }, [save, backup]);

  useEffect(() => { if (dirty.current) backup(); }, [title, notesBefore, notesAfter, backup]);

  /* Bring back text that was never saved (for example after the sign-in ran out). */
  useEffect(() => {
    if (!editor) return;
    let saved: { title: string; notesBefore: string; notesAfter: string; body: string } | null = null;
    try { saved = JSON.parse(localStorage.getItem(backupKey) ?? "null"); } catch { saved = null; }
    if (!saved) return;
    const differs = saved.body !== editor.getHTML() || saved.title !== initial.title
      || saved.notesBefore !== initial.notes_before || saved.notesAfter !== initial.notes_after;
    if (!differs) { try { localStorage.removeItem(backupKey); } catch { /* */ } return; }
    editor.commands.setContent(saved.body, { emitUpdate: false });
    setTitle(saved.title); setNotesBefore(saved.notesBefore); setNotesAfter(saved.notesAfter);
    setWords(countWords(saved.body));
    setRestored(true);
    dirty.current = true;
    timer.current = setTimeout(() => void save(), 1000);
  }, [editor]); // eslint-disable-line react-hooks/exhaustive-deps

  /* Warn before leaving with unsaved text; retry saving when coming back to this tab. */
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => { if (dirty.current) { e.preventDefault(); e.returnValue = ""; } };
    const retry = () => { if (dirty.current) void save(); };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("focus", retry);
    return () => { window.removeEventListener("beforeunload", warn); window.removeEventListener("focus", retry); };
  }, [save]);

  useEffect(() => {
    const flush = () => { if (dirty.current) void save(); };
    window.addEventListener("pagehide", flush);
    return () => { window.removeEventListener("pagehide", flush); flush(); };
  }, [save]);

  useEffect(() => {
    const f = readPref("fic-admin-editor-font");
    if (f && f in FONT_STACKS) { setFont(f); loadWebFont(f); }
    const s = Number(readPref("fic-admin-editor-size"));
    if (s >= 12 && s <= 28) setSize(s);
  }, []);

  if (!editor) return <p className="a-muted">Loading the editor…</p>;
  function pickFont(v: string) { setFont(v); loadWebFont(v); writePref("fic-admin-editor-font", v); }
  function changeSize(n: number) { const v = Math.max(12, Math.min(28, n)); setSize(v); writePref("fic-admin-editor-size", String(v)); }
  return (
    <div className="a-editor">
      {restored && <p className="a-restored" role="status">Brought back text that hadn’t been saved yet. It’s saving now.</p>}
      <PublishBar ficId={ficId} chapterId={chapterId} publishAt={publishAt} save={() => save(true)} />
      <PreviewLinks chapterId={chapterId} />
      <VersionsPanel chapterId={chapterId} flush={() => save(true)} onRestored={(r) => {
        editor.commands.setContent(r.body, { emitUpdate: false });
        setTitle(r.title); setNotesBefore(r.notes_before); setNotesAfter(r.notes_after); setWords(countWords(r.body));
        dirty.current = false; setState("saved");
        try { localStorage.removeItem(backupKey); } catch { /* storage blocked */ }
      }} />
      <EditorMenu editor={editor} words={words} size={size} onSize={changeSize} onSave={() => void save(true)} />
      <EditorToolbar editor={editor} font={font} size={size} onFont={pickFont} onSize={changeSize}><ImageButton editor={editor} ficId={ficId} /></EditorToolbar>
      <PasteHtml ficId={ficId} onUse={async (html, mode) => {
        if (mode === "replace") {
          /* Replacing the whole chapter: first save what's there and keep a copy, so it can always be brought back. */
          if (!(await save(true)) || !(await snapshotChapter(chapterId, "paste"))) { setState("error"); return; }
          editor.chain().focus().setContent(html, { emitUpdate: true }).run();
        } else editor.chain().focus("end").insertContent(html).run();
      }} />

      <label className="a-title-field">
        <span className="sr-only">Chapter title</span>
        <input aria-label="Chapter title" placeholder="Chapter title" value={title} onChange={(e) => { setTitle(e.target.value); schedule(); }} />
      </label>
      <details className="a-notes">
        <summary>Notes before the chapter</summary>
        <textarea aria-label="Notes before the chapter" rows={3} value={notesBefore} onChange={(e) => { setNotesBefore(e.target.value); schedule(); }} />
      </details>
      <div className="a-writing" style={{ fontFamily: FONT_STACKS[font], fontSize: `${size}px` }}>
        <EditorContent editor={editor} />
      </div>
      <details className="a-notes">
        <summary>Notes after the chapter</summary>
        <textarea aria-label="Notes after the chapter" rows={3} value={notesAfter} onChange={(e) => { setNotesAfter(e.target.value); schedule(); }} />
      </details>

      <div className="a-statusbar">
        <span className="a-wordcount">{words === 1 ? "1 word" : `${words.toLocaleString("en-US")} words`}</span>
        <span className="a-save-state" role="status" data-state={state}>{SAVE_LABEL[state]}</span>
        {state === "signed_out" && <a href="/admin-login" target="_blank" rel="noopener" className="a-link">Sign in (opens a new tab)</a>}
      </div>
    </div>
  );
}
