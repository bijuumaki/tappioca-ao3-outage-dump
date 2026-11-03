"use client";
import Link from "next/link";
import { useState } from "react";
import type { Editor } from "@tiptap/react";

/* A message the publish bar listens for: "preview" or "publish". */
export const EDITOR_EVENT = "tappioca:editor";

type MenuId = "file" | "edit" | "view";
const MENUS: [MenuId, string][] = [["file", "File"], ["edit", "Edit"], ["view", "View"]];

/* The editor's menu row from the canvas: File, Edit and View, each opening a row of underlined links.
   Under 1024px the row sits behind the hamburger button. */
export default function EditorMenu({ editor, words, size, onSize, onSave }: {
  editor: Editor; words: number; size: number; onSize: (n: number) => void; onSave: () => void;
}) {
  const [open, setOpen] = useState<MenuId | null>(null);
  const [hamburger, setHamburger] = useState(false);
  const [info, setInfo] = useState("");
  const ask = (what: "preview" | "publish") => window.dispatchEvent(new CustomEvent(EDITOR_EVENT, { detail: what }));
  const run = (fn: () => void) => () => { fn(); };
  const chain = () => editor.chain().focus();

  const items: Record<MenuId, React.ReactNode> = {
    file: (
      <>
        <button type="button" onClick={run(() => { onSave(); setInfo("Saving the draft."); })}>Save draft</button>
        <button type="button" onClick={run(() => ask("preview"))}>Preview</button>
        <button type="button" onClick={run(() => ask("publish"))}>Publish</button>
        <Link href="/admin">Back to stories</Link>
      </>
    ),
    edit: (
      <>
        <button type="button" onClick={run(() => chain().undo().run())}>Undo</button>
        <button type="button" onClick={run(() => chain().redo().run())}>Redo</button>
        <button type="button" onClick={run(() => chain().unsetAllMarks().unsetTextAlign().clearNodes().run())}>Clear formatting</button>
      </>
    ),
    view: (
      <>
        <button type="button" onClick={run(() => setInfo(words === 1 ? "1 word" : `${words.toLocaleString("en-US")} words`))}>Word count</button>
        <button type="button" aria-label="Smaller text" onClick={run(() => { onSize(size - 2); setInfo(`Text size ${size - 2}`); })}>Text size −</button>
        <button type="button" aria-label="Larger text in the editor" onClick={run(() => { onSize(size + 2); setInfo(`Text size ${size + 2}`); })}>Text size +</button>
      </>
    ),
  };

  return (
    <div className="a-menu">
      <div className="a-menu-bar">
        <button type="button" className="a-menu-burger" aria-label="Menu" aria-expanded={hamburger} onClick={() => { setHamburger(!hamburger); setOpen(null); }}>
          <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M3 6h18M3 12h18M3 18h18" /></svg>
        </button>
        <div className="a-menu-names" data-open={hamburger || undefined}>
          {MENUS.map(([id, label]) => (
            <button key={id} type="button" aria-expanded={open === id} onClick={() => { setOpen(open === id ? null : id); setInfo(""); }}>{label}</button>
          ))}
        </div>
      </div>
      {open && <div className="a-menu-items" role="group" aria-label={MENUS.find(([id]) => id === open)![1]}>{items[open]}</div>}
      {info && <p role="status" className="a-muted a-menu-info">{info}</p>}
    </div>
  );
}
