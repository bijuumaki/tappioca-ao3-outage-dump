"use client";
import { useEffect } from "react";

/* Readers can't select, copy or drag text and pictures on the public pages (Bijuu's choice). The CSS on .site does the
   selecting part; this stops copy, cut, select-all and dragging that CSS misses. Boxes people type in, and the
   edit-in-place editor when Bijuu is signed in, stay normal. Copy buttons that write the feed address still work,
   because they don't go through the copy event. A speed bump only: view-source, reader mode and screenshots get around it. */
const EDITABLE = "input, textarea, select, [contenteditable=''], [contenteditable='true']";

function inEditable(node: EventTarget | null): boolean {
  const el = node instanceof Element ? node : node instanceof Node ? node.parentElement : null;
  return !!el?.closest(EDITABLE);
}

export default function NoCopy() {
  useEffect(() => {
    const block = (e: Event) => {
      if (inEditable(e.target) || inEditable(document.activeElement)) return;
      e.preventDefault();
    };
    const events = ["copy", "cut", "selectstart", "dragstart"] as const;
    events.forEach((name) => document.addEventListener(name, block));
    return () => events.forEach((name) => document.removeEventListener(name, block));
  }, []);
  return null;
}
