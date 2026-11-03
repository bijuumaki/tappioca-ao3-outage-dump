"use client";
import { useEditorState, type Editor } from "@tiptap/react";
import { FONTS } from "@/lib/client/prefs";

function Icon({ d }: { d: string }) {
  return <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}
export const ICONS = {
  undo: "M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3", redo: "m15 14 5-5-5-5M20 9H9a5 5 0 0 0 0 10h3",
  bold: "M7 5h6a3.5 3.5 0 0 1 0 7H7zM7 12h7a3.5 3.5 0 0 1 0 7H7z", italic: "M19 4h-9M14 20H5M15 4 9 20",
  underline: "M6 4v6a6 6 0 0 0 12 0V4M4 21h16", strike: "M16 6a4 4 0 0 0-4-2c-2.2 0-4 1.3-4 3s1.5 2.5 4 3M4 12h16M8 18a4 4 0 0 0 4 2c2.2 0 4-1.3 4-3",
  link: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1",
  quote: "M7 7H4v6h4v-1a5 5 0 0 1-3 4M17 7h-3v6h4v-1a5 5 0 0 1-3 4", scene: "M5 12h.01M12 12h.01M19 12h.01",
  bullets: "M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01", numbers: "M10 6h10M10 12h10M10 18h10M4 4v4M3 18h3l-3 3h3",
  left: "M4 6h16M4 10h10M4 14h16M4 18h10", center: "M4 6h16M7 10h10M4 14h16M7 18h10",
  right: "M4 6h16M10 10h10M4 14h16M10 18h10", justify: "M4 6h16M4 10h16M4 14h16M4 18h16",
  clear: "M6 4h12M12 4l-4 16M4 20l16-16",
  unlink: "M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1M4 4l16 16",
  image: "M4 5h16v14H4zM4 16l5-5 4 4 3-3 4 4M9 9h.01",
};

export type ToolbarProps = {
  editor: Editor;
  /* Font and size only change how the writing area looks; leave out to hide those controls. */
  font?: string; size?: number; onFont?: (v: string) => void; onSize?: (n: number) => void;
  /* Extra buttons placed at the end (for example the Image button). */
  children?: React.ReactNode;
};

export default function EditorToolbar({ editor, font, size, onFont, onSize, children }: ToolbarProps) {
  const active = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e.isActive("bold"), italic: e.isActive("italic"), underline: e.isActive("underline"), strike: e.isActive("strike"),
      quote: e.isActive("blockquote"), bullets: e.isActive("bulletList"), numbers: e.isActive("orderedList"), link: e.isActive("link"),
      left: e.isActive({ textAlign: "left" }), center: e.isActive({ textAlign: "center" }), right: e.isActive({ textAlign: "right" }),
      justify: e.isActive({ textAlign: "justify" }),
      style: e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : "p",
      color: (e.getAttributes("textStyle").color as string | undefined) ?? "#000000",
    }),
  });
  const chain = () => editor.chain().focus();
  const btn = (label: string, icon: string, pressed: boolean | undefined, run: () => void) => (
    <button type="button" aria-label={label} title={label} aria-pressed={pressed ?? undefined} onMouseDown={(e) => e.preventDefault()} onClick={run}>
      <Icon d={icon} />
    </button>
  );
  function setLink() {
    const prev = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link address (leave empty to remove)", prev ?? "https://");
    if (url === null) return;
    if (!url.trim()) chain().unsetLink().run();
    else chain().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  return (
    <div role="toolbar" aria-label="Formatting" className="a-toolbar-row">
      {btn("Undo", ICONS.undo, undefined, () => chain().undo().run())}
      {btn("Redo", ICONS.redo, undefined, () => chain().redo().run())}
      <select aria-label="Text style" value={active.style} onChange={(e) => {
        const v = e.target.value;
        if (v === "p") chain().setParagraph().run(); else chain().setHeading({ level: v === "h2" ? 2 : 3 }).run();
      }}>
        <option value="p">Paragraph text</option><option value="h2">Heading</option><option value="h3">Subheading</option>
      </select>
      {onFont && font !== undefined && (
        <select aria-label="Font" value={font} onChange={(e) => onFont(e.target.value)} title="Changes only how this page looks while you write">
          {FONTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      )}
      {onSize && size !== undefined && (
        <span className="a-size">
          <button type="button" aria-label="Smaller text" onClick={() => onSize(size - 2)}>−</button>
          <span>{size}</span>
          <button type="button" aria-label="Larger text" onClick={() => onSize(size + 2)}>+</button>
        </span>
      )}
      {btn("Bold", ICONS.bold, active.bold, () => chain().toggleBold().run())}
      {btn("Italic", ICONS.italic, active.italic, () => chain().toggleItalic().run())}
      {btn("Underline", ICONS.underline, active.underline, () => chain().toggleUnderline().run())}
      {btn("Strikethrough", ICONS.strike, active.strike, () => chain().toggleStrike().run())}
      <label className="a-swatch" title="Text color">
        <span className="sr-only">Text color</span>
        <input type="color" aria-label="Text color" value={active.color} onChange={(e) => chain().setColor(e.target.value).run()} />
      </label>
      <label className="a-swatch a-swatch-hl" title="Highlight color">
        <span className="sr-only">Highlight color</span>
        <input type="color" aria-label="Highlight color" defaultValue="#fff2a8" onChange={(e) => chain().setHighlight({ color: e.target.value }).run()} />
      </label>
      {btn("Link", ICONS.link, active.link, setLink)}
      {btn("Remove link", ICONS.unlink, undefined, () => chain().unsetLink().run())}
      {btn("Quote", ICONS.quote, active.quote, () => chain().toggleBlockquote().run())}
      {btn("Scene break", ICONS.scene, undefined, () => chain().setHorizontalRule().run())}
      {btn("Bulleted list", ICONS.bullets, active.bullets, () => chain().toggleBulletList().run())}
      {btn("Numbered list", ICONS.numbers, active.numbers, () => chain().toggleOrderedList().run())}
      {btn("Align left", ICONS.left, active.left, () => chain().setTextAlign("left").run())}
      {btn("Align center", ICONS.center, active.center, () => chain().setTextAlign("center").run())}
      {btn("Align right", ICONS.right, active.right, () => chain().setTextAlign("right").run())}
      {btn("Justify", ICONS.justify, active.justify, () => chain().setTextAlign("justify").run())}
      {btn("Clear formatting", ICONS.clear, undefined, () => chain().unsetAllMarks().unsetTextAlign().clearNodes().run())}
      {children}
    </div>
  );
}
