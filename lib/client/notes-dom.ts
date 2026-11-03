import type { Mark } from "@/lib/notes/model";

/* Chapter text is addressed by character offsets into its text. A Range's string is the text nodes joined, the same as textContent. */
export function offsetOf(root: Element, node: Node, offset: number): number {
  const r = document.createRange();
  r.selectNodeContents(root);
  r.setEnd(node, offset);
  return r.toString().length;
}

export function rangeAt(root: Element, start: number, end: number): Range | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const r = document.createRange();
  let pos = 0, started = false;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const len = node.nodeValue?.length ?? 0;
    if (!started && start < pos + len) { r.setStart(node, start - pos); started = true; }
    if (started && end <= pos + len) { r.setEnd(node, end - pos); return r; }
    pos += len;
  }
  return null;
}

/* If the chapter text was edited since, find the quote again, nearest its old place. Null when it is gone. */
export function locate(text: string, m: Pick<Mark, "start" | "end" | "quote">): { start: number; end: number } | null {
  if (text.slice(m.start, m.end) === m.quote) return { start: m.start, end: m.end };
  if (!m.quote) return null;
  let best = -1;
  for (let i = text.indexOf(m.quote); i !== -1; i = text.indexOf(m.quote, i + 1)) {
    if (best === -1 || Math.abs(i - m.start) < Math.abs(best - m.start)) best = i;
  }
  return best === -1 ? null : { start: best, end: best + m.quote.length };
}

/* The text offset under a screen point, for tapping an existing highlight. */
export function offsetAtPoint(root: Element, x: number, y: number): number | null {
  const doc = document as Document & {
    caretPositionFromPoint?: (x: number, y: number) => { offsetNode: Node; offset: number } | null;
    caretRangeFromPoint?: (x: number, y: number) => Range | null;
  };
  let node: Node | null = null, off = 0;
  if (doc.caretPositionFromPoint) {
    const p = doc.caretPositionFromPoint(x, y);
    if (p) { node = p.offsetNode; off = p.offset; }
  } else if (doc.caretRangeFromPoint) {
    const r = doc.caretRangeFromPoint(x, y);
    if (r) { node = r.startContainer; off = r.startOffset; }
  }
  return node && root.contains(node) ? offsetOf(root, node, off) : null;
}

/* Paints the highlights with the browser's Custom Highlight API: nothing is added to the page's HTML, so it can't disturb the
   text. Browsers without it simply show no color; the notes list still works. */
type HighlightApi = { highlights: Map<string, unknown> };
export function paint(root: Element, marks: Mark[]): void {
  const css = (window as unknown as { CSS?: Partial<HighlightApi> }).CSS;
  const Ctor = (window as unknown as { Highlight?: new (...r: Range[]) => unknown }).Highlight;
  if (!css?.highlights || !Ctor) return;
  const text = root.textContent ?? "";
  const byColor = new Map<string, Range[]>();
  for (const m of marks) {
    const at = locate(text, m);
    const range = at && rangeAt(root, at.start, at.end);
    if (!range) continue;
    byColor.set(m.color, [...(byColor.get(m.color) ?? []), range]);
  }
  for (const c of ["yellow", "pink", "green", "blue"]) {
    const ranges = byColor.get(c);
    if (ranges) css.highlights.set(`hl-${c}`, new Ctor(...ranges)); else css.highlights.delete(`hl-${c}`);
  }
}
