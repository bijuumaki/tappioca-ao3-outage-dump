"use client";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { editorExtensions } from "@/lib/admin/editor-extensions";
import { amSignedInAsAdmin, savePageText } from "@/lib/admin/page-actions";
import type { PageSlug } from "@/lib/admin/page-texts";

/* Edit in place (canvas v131 to v134). Readers only ever get `children`. When Bijuu is signed in, the text becomes the editor. */
export default function InlinePageEditor({ slug, label, initial, children }: { slug: PageSlug; label: string; initial: string; children: ReactNode }) {
  const [admin, setAdmin] = useState(false);
  useEffect(() => {
    let live = true;
    amSignedInAsAdmin().then((yes) => { if (live) setAdmin(yes); }).catch(() => undefined);
    return () => { live = false; };
  }, []);
  if (!admin) return <>{children}</>;
  return <Editing slug={slug} label={label} initial={initial} />;
}

type State = "idle" | "saving" | "saved" | "signed_out" | "error";
const STATUS: Record<State, string> = {
  idle: "You are signed in. Changes save as you type.", saving: "Saving…", saved: "Saved",
  signed_out: "Not saved: sign in again", error: "Not saved: try again in a moment",
};
const LINK_OK = /^(https?:\/\/|mailto:)/i;

function Editing({ slug, label, initial }: { slug: PageSlug; label: string; initial: string }) {
  const [state, setState] = useState<State>("idle");
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: editorExtensions,
    content: initial,
    editorProps: { attributes: { class: "inline-edit-text rich-text", "aria-label": `${label} text`, role: "textbox", "aria-multiline": "true" } },
    onUpdate: () => { dirty.current = true; setState("idle"); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(() => void save(), 1500); },
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
    <div className="inline-edit">
      {editor && <PageToolbar editor={editor} />}
      <EditorContent editor={editor} />
      <p className="inline-edit-status muted" role="status" data-state={state}>{STATUS[state]}</p>
    </div>
  );
}

function PageToolbar({ editor }: { editor: Editor }) {
  const on = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"),
      heading: e.isActive("heading", { level: 3 }), list: e.isActive("bulletList"), quote: e.isActive("blockquote"), link: e.isActive("link"),
    }),
  });
  const [linkOpen, setLinkOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [msg, setMsg] = useState("");
  const run = () => editor.chain().focus();
  const keep = (e: React.MouseEvent) => e.preventDefault();
  const btn = (label: string, text: ReactNode, pressed: boolean, go: () => void, cls = "") => (
    <button type="button" className={cls} aria-label={label} aria-pressed={pressed} onMouseDown={keep} onClick={go}>{text}</button>
  );

  function openLink() {
    setUrl((editor.getAttributes("link").href as string | undefined) ?? "");
    setMsg("");
    setLinkOpen(true);
  }
  function addLink() {
    const href = url.trim();
    if (!LINK_OK.test(href)) { setMsg("That address needs to start with https://, http:// or mailto:"); return; }
    run().extendMarkRange("link").setLink({ href }).run();
    setLinkOpen(false);
  }

  return (
    <>
      <div role="toolbar" aria-label="Text formatting" className="inline-edit-toolbar">
        {btn("Bold", "B", on.bold, () => run().toggleBold().run(), "ie-bold")}
        {btn("Italic", "I", on.italic, () => run().toggleItalic().run(), "ie-italic")}
        {btn("Underline", "U", on.underline, () => run().toggleUnderline().run(), "ie-underline")}
        {btn("Heading", "Heading", on.heading, () => run().toggleHeading({ level: 3 }).run())}
        {btn("Bulleted list", "List", on.list, () => run().toggleBulletList().run())}
        {btn("Quote", "Quote", on.quote, () => run().toggleBlockquote().run())}
        {btn("Add or edit a link", "Link", on.link, openLink, "ie-underline")}
      </div>
      {linkOpen && (
        <div className="inline-edit-link">
          <label>Link address
            <input type="url" inputMode="url" placeholder="https://" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }} />
          </label>
          <button type="button" className="story-primary" onClick={addLink}>Add link</button>
          <button type="button" className="story-secondary" onClick={() => { run().extendMarkRange("link").unsetLink().run(); setLinkOpen(false); }}>Remove link</button>
          <button type="button" className="ie-cancel" onClick={() => setLinkOpen(false)}>Cancel</button>
          <p className="muted" role="status">{msg || "Select some words first, then paste the address. Only http, https and mailto links are allowed."}</p>
        </div>
      )}
    </>
  );
}
