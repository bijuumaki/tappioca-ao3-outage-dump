"use client";
import { useEffect, useRef, useState } from "react";
import { clampSize, FONTS, loadWebFont, readPref, SIZE_MAX, SIZE_MIN, SPACINGS, THEMES, writePref } from "@/lib/client/prefs";
import { useReaderInfo } from "@/lib/client/reader-store";

export default function DisplayOptions() {
  const reader = useReaderInfo();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("day");
  const [size, setSize] = useState(14);
  const [font, setFont] = useState("default");
  const [spacing, setSpacing] = useState("normal");
  const [hidden, setHidden] = useState(false);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    setTheme(root.getAttribute("data-theme") ?? "day");
    setSize(clampSize(readPref("fic-site-size")));
    setFont(root.getAttribute("data-font") ?? "default");
    setSpacing(root.getAttribute("data-spacing") ?? "normal");
  }, []);

  /* On narrow screens, the button slides away while reading downward and comes back on the way up. */
  useEffect(() => {
    if (!reader) { setHidden(false); return; }
    let lastY = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      if (Math.abs(y - lastY) < 8) return;
      const hide = y > lastY && y > 80 && window.innerWidth < 900;
      lastY = y;
      setHidden(hide);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [reader]);

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

  useEffect(() => {
    const toggle = () => setOpen((o) => !o);
    window.addEventListener("tappioca:toggle-options", toggle);
    return () => window.removeEventListener("tappioca:toggle-options", toggle);
  }, []);

  /* On wide screens the panel pushes a chapter over instead of covering it. */
  useEffect(() => {
    document.documentElement.toggleAttribute("data-dock", open && !!reader);
    return () => document.documentElement.removeAttribute("data-dock");
  }, [open, reader]);

  const root = () => document.documentElement;
  function pickTheme(v: string) { root().setAttribute("data-theme", v); writePref("fic-site-theme", v); setTheme(v); }
  function changeSize(n: number) {
    const v = clampSize(n);
    root().style.setProperty("--fs", String(v / 14));
    root().style.setProperty("--read", `${v}pt`);
    writePref("fic-site-size", String(v));
    setSize(v);
  }
  function pickFont(v: string) {
    loadWebFont(v);
    if (v === "default") root().removeAttribute("data-font"); else root().setAttribute("data-font", v);
    writePref("fic-site-font", v);
    setFont(v);
  }
  function pickSpacing(v: string) {
    if (v === "normal") root().removeAttribute("data-spacing"); else root().setAttribute("data-spacing", v);
    writePref("fic-site-spacing", v);
    setSpacing(v);
  }

  return (
    <>
      <button ref={button} type="button" className="aa-button" data-hidden={hidden && !open} aria-label="Display options"
        aria-expanded={open} aria-controls="display-options" onClick={() => setOpen(!open)} onFocus={() => setHidden(false)}>Aa</button>
      <section ref={panel} id="display-options" className="options-panel" role="dialog" aria-label="Display options" hidden={!open}>
        <div className="options-head">
          {reader && <span className="options-hint">adjust for your eyes</span>}
          <button type="button" className="options-close" aria-label="Close display options" onClick={() => { setOpen(false); button.current?.focus(); }}>
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" /></svg>
          </button>
        </div>
        <div className="options-row">
          <span>Text size</span>
          <span className="options-stepper">
            <button type="button" aria-label="Smaller text" disabled={size <= SIZE_MIN} onClick={() => changeSize(size - 2)}>−</button>
            <output aria-live="polite">{size}pt</output>
            <button type="button" aria-label="Larger text" disabled={size >= SIZE_MAX} onClick={() => changeSize(size + 2)}>+</button>
          </span>
        </div>
        <div className="options-field">
          <label htmlFor="options-font">Font</label>
          <select id="options-font" value={font} onChange={(e) => pickFont(e.target.value)}>
            {FONTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="options-field" role="group" aria-label="Line spacing">
          <span>Line spacing</span>
          <div className="options-choices">
            {SPACINGS.map(([v, l]) => <button key={v} type="button" aria-pressed={spacing === v} onClick={() => pickSpacing(v)}>{l}</button>)}
          </div>
        </div>
        <div className="options-row options-wrap" role="group" aria-label="Theme">
          <span>Theme</span>
          <div className="options-choices">
            {THEMES.map(([v, l]) => <button key={v} type="button" aria-pressed={theme === v} onClick={() => pickTheme(v)}>{l}</button>)}
          </div>
        </div>
      </section>
    </>
  );
}
