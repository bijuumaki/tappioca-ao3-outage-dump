"use client";
import { useEffect, useRef, useState } from "react";
import { clampSize, FONT_NAMES, loadWebFont, readPref, writePref } from "@/lib/client/prefs";

export default function TextOptions() {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(14);
  const [font, setFont] = useState("default");
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSize(clampSize(readPref("fic-site-size")));
    const f = readPref("fic-site-font");
    setFont(f && (FONT_NAMES as readonly string[]).includes(f) ? f : "default");
  }, []);

  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { setOpen(false); button.current?.focus(); }
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function changeSize(value: string) {
    const n = clampSize(value);
    document.documentElement.style.setProperty("--fs", `${n}pt`);
    writePref("fic-site-size", String(n));
    setSize(n);
  }

  function changeFont(value: string) {
    const v = (FONT_NAMES as readonly string[]).includes(value) ? value : "default";
    loadWebFont(v);
    if (v === "default") document.documentElement.removeAttribute("data-font");
    else document.documentElement.setAttribute("data-font", v);
    writePref("fic-site-font", v);
    setFont(v);
  }

  return (
    <>
      <button ref={button} className="tool tool-aa" id="aa-toggle" type="button" aria-label="Aa text options"
        aria-expanded={open} aria-controls="size-panel" onClick={() => setOpen(!open)}>Aa</button>
      <div ref={panel} className="size-panel" id="size-panel" role="group" aria-label="Text options" hidden={!open}>
        <div className="size-row">
          <label className="sr-only" htmlFor="size-slider">Text size in points</label>
          <input id="size-slider" type="range" min={10} max={24} step={2} value={size} onChange={(e) => changeSize(e.target.value)} />
          <output id="size-out" htmlFor="size-slider">{size}pt</output>
        </div>
        <div className="font-field">
          <label htmlFor="font-select">Font</label>
          <select id="font-select" value={font} onChange={(e) => changeFont(e.target.value)}>
            <option value="default">Default</option>
            <optgroup label="Sans serif">
              <option value="lucida">Lucida Sans</option>
              <option value="cantarell">Cantarell</option>
              <option value="tahoma">Tahoma</option>
            </optgroup>
            <optgroup label="Serif">
              <option value="crimson">Crimson Pro</option>
              <option value="imfell">IM Fell English</option>
              <option value="cormorant">Cormorant Garamond</option>
            </optgroup>
          </select>
        </div>
      </div>
    </>
  );
}
