"use client";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import { Color, TextStyle } from "@tiptap/extension-text-style";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveChapter, type ChapterInput } from "@/lib/admin/actions";
import { BlockColor } from "@/lib/admin/block-color";
import PublishBar from "./PublishBar";
import { FONTS, loadWebFont, readPref, writePref } from "@/lib/client/prefs";
import { countWords } from "@/lib/text/words";

type SaveState = "idle" | "saving" | "saved" | "signed_out" | "error";
const SAVE_LABEL: Record<SaveState, string> = {
  idle: "", saving: "Saving…", saved: "Saved", signed_out: "Not saved: sign in again", error: "Not saved: try again in a moment",
};
const FONT_STACKS: Record<string, string> = {
  default: "var(--font-body)", lucida: "var(--stack-lucida)", cantarell: "var(--stack-cantarell)", tahoma: "var(--stack-tahoma)",
  crimson: "var(--stack-crimson)", imfell: "var(--stack-imfell)", cormorant: "var(--stack-cormorant)",
};

function Icon({ d }: { d: string }) {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}
const I = {
  undo: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3", redo: "m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3",
  bold: "M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z", italic: "M19 4h-9M14 20H5M15 4 9 20",
  underline: "M6 4v6a6 6 0 0 0 12 0V4M4 21h16", strike: "M16 6a4 4 0 0 0-4-2c-2.2 0-4 1.3-4 3s1.5 2.5 4 3M4 12h16M8 18a4 4 0 0 0 4 2c2.2 0 4-1.3 4-3",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  quote: "M7 7H4v6h4v-1a5 5 0 0 1-3 4M17 7h-3v6h4v-1a5 5 0 0 1-3 4", scene: "M5 12h.01M12 12h.01M19 12h.01",
  bullets: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01", numbers: "M10 6h10M10 12h10M10 18h10M4 4v4M3 18h3l-3 3h3",
  left: "M4 6h16M4 10h10M4 14h16M4 18h10", center: "M4 6h16M7 10h10M4 14h16M7 18h10",
  right: "M4 6h16M10 10h10M4 14h16M10 18h10", justify: "M4 6h16M4 10h16M4 14h16M4 18h16",
  clear: "M6 4h12M12 4l-4 16M4 20l16-16",
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
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } }),
      TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
      TextStyle, Color, Highlight.configure({ multicolor: true }), BlockColor,
    ],
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

  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => e ? {
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), strike: e.isActive("strike"),
      quote: e.isActive("blockquote"), bullets: e.isActive("bulletList"), numbers: e.isActive("orderedList"), link: e.isActive("link"),
      left: e.isActive({ textAlign: "left" }), center: e.isActive({ textAlign: "center" }), right: e.isActive({ textAlign: "right" }),
      justify: e.isActive({ textAlign: "justify" }),
      style: e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : "p",
      color: (e.getAttributes("textStyle").color as string | undefined) ?? "#000000",
    } : null,
  });

  if (!editor) return <p className="a-muted">Loading the editor…</p>;
  const ed = editor;
  const chain = () => ed.chain().focus();
  const btn = (label: string, icon: string, pressed: boolean | undefined, run: () => void) => (
    <button type="button" aria-label={label} title={label} aria-pressed={pressed ?? undefined} onMouseDown={(e) => e.preventDefault()} onClick={run}>
      <Icon d={icon} />
    </button>
  );

  function pickFont(v: string) { setFont(v); loadWebFont(v); writePref("fic-admin-editor-font", v); }
  function changeSize(n: number) { const v = Math.max(12, Math.min(28, n)); setSize(v); writePref("fic-admin-editor-size", String(v)); }
  function setLink() {
    const prev = ed.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address (leave empty to remove)", prev ?? "https://");
    if (url === null) return;
    if (!url.trim()) chain().unsetLink().run();
    else chain().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div className="a-editor">
      {restored && <p className="a-restored" role="status">Brought back text that hadn’t been saved yet. It’s saving now.</p>}
      <PublishBar ficId={ficId} chapterId={chapterId} publishAt={publishAt} save={() => save(true)} />
      <div role="toolbar" aria-label="Formatting" className="a-toolbar-row">
        {btn("Undo", I.undo, undefined, () => chain().undo().run())}
        {btn("Redo", I.redo, undefined, () => chain().redo().run())}
        <select aria-label="Text style" value={active?.style ?? "p"} onChange={(e) => {
          const v = e.target.value;
          if (v === "p") chain().setParagraph().run(); else chain().setHeading({ level: v === "h2" ? 2 : 3 }).run();
        }}>
          <option value="p">Paragraph text</option><option value="h2">Heading</option><option value="h3">Subheading</option>
        </select>
        <select aria-label="Font" value={font} onChange={(e) => pickFont(e.target.value)} title="Changes only how this page looks while you write">
          {FONTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <span className="a-size">
          <button type="button" aria-label="Smaller text" onClick={() => changeSize(size - 2)}>−</button>
          <span>{size}</span>
          <button type="button" aria-label="Larger text" onClick={() => changeSize(size + 2)}>+</button>
        </span>
        {btn("Bold", I.bold, active?.bold, () => chain().toggleBold().run())}
        {btn("Italic", I.italic, active?.italic, () => chain().toggleItalic().run())}
        {btn("Underline", I.underline, active?.underline, () => chain().toggleUnderline().run())}
        {btn("Strikethrough", I.strike, active?.strike, () => chain().toggleStrike().run())}
        <label className="a-swatch" title="Text color">
          <span className="sr-only">Text color</span>
          <input type="color" aria-label="Text color" value={active?.color ?? "#000000"} onChange={(e) => chain().setColor(e.target.value).run()} />
        </label>
        <label className="a-swatch a-swatch-hl" title="Highlight color">
          <span className="sr-only">Highlight color</span>
          <input type="color" aria-label="Highlight color" defaultValue="#fff2a8" onChange={(e) => chain().setHighlight({ color: e.target.value }).run()} />
        </label>
        {btn("Link", I.link, active?.link, setLink)}
        {btn("Quote", I.quote, active?.quote, () => chain().toggleBlockquote().run())}
        {btn("Scene break", I.scene, undefined, () => chain().setHorizontalRule().run())}
        {btn("Bulleted list", I.bullets, active?.bullets, () => chain().toggleBulletList().run())}
        {btn("Numbered list", I.numbers, active?.numbers, () => chain().toggleOrderedList().run())}
        {btn("Align left", I.left, active?.left, () => chain().setTextAlign("left").run())}
        {btn("Align center", I.center, active?.center, () => chain().setTextAlign("center").run())}
        {btn("Align right", I.right, active?.right, () => chain().setTextAlign("right").run())}
        {btn("Justify", I.justify, active?.justify, () => chain().setTextAlign("justify").run())}
        {btn("Clear formatting", I.clear, undefined, () => chain().unsetAllMarks().unsetTextAlign().clearNodes().run())}
      </div>

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
        {state === "signed_out" && <a href="/admin/login" target="_blank" rel="noopener" className="a-link">Sign in (opens a new tab)</a>}
      </div>
    </div>
  );
}
