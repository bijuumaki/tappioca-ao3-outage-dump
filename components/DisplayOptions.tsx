"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { clampSize, FONTS, loadWebFont, readPref, SIZE_MAX, SIZE_MIN, SPACINGS, THEMES, writePref } from "@/lib/client/prefs";

/* The font cards, grouped the way the canvas shows them. Each card is the font's name set in that font. */
const FONT_GROUPS = [
  { label: "Serif", fonts: ["crimson", "ebgaramond", "charter"] },
  { label: "Sans serif", fonts: ["default", "lucida", "cantarell", "avenir"] },
] as const;
const fontLabel = (v: string) => (v === "default" ? "Inclusive Sans (default)" : FONTS.find(([k]) => k === v)?.[1] ?? v);
import { useReaderInfo } from "@/lib/client/reader-store";
import SyncDialog from "@/components/SyncDialog";
import { setSharing, sharing } from "@/lib/client/notes-share";

export default function DisplayOptions() {
  const reader = useReaderInfo();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("day");
  const [size, setSize] = useState(14);
  const [font, setFont] = useState("default");
  const [spacing, setSpacing] = useState("normal");
  const [hidden, setHidden] = useState(false);
  const [syncOpen, setSyncOpen] = useState(false);
  const [share, setShare] = useState(true);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = document.documentElement;
    setTheme(root.getAttribute("data-theme") ?? "day");
    setSize(clampSize(readPref("fic-site-size")));
    setFont(root.getAttribute("data-font") ?? "default");
    setSpacing(root.getAttribute("data-spacing") ?? "normal");
    setShare(sharing());
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
      if (!panel.current?.contains(t) && !button.current?.contains(t) && !(t as Element).closest?.(".sync-dialog")) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !syncOpen) { setOpen(false); button.current?.focus(); }
    }
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
  }, [open, syncOpen]);

  /* The font cards show each font, so their web fonts are fetched the first time the panel opens. */
  useEffect(() => { if (open) FONTS.forEach(([v]) => loadWebFont(v)); }, [open]);

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
        <div className="options-group" role="group" aria-label="Theme">
          <h3 className="options-heading">Theme</h3>
          <div className="swatch-row">
            {THEMES.map(([v, l]) => (
              <button key={v} type="button" className="swatch-btn" data-swatch={v} aria-pressed={theme === v} onClick={() => pickTheme(v)}>
                <span className="swatch" aria-hidden="true" />
                <span>{l}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="options-group">
          <h3 className="options-heading"><label htmlFor="options-size">Text size</label> <output className="options-value" aria-live="polite">{size}pt</output></h3>
          <div className="size-row">
            <span className="size-small" aria-hidden="true">A</span>
            <input id="options-size" type="range" min={SIZE_MIN} max={SIZE_MAX} step={2} value={size} onChange={(e) => changeSize(Number(e.target.value))} />
            <span className="size-large" aria-hidden="true">A</span>
          </div>
        </div>
        {FONT_GROUPS.map((g) => (
          <div key={g.label} className="options-group" role="group" aria-label={`${g.label} fonts`}>
            <h3 className="options-heading">{g.label}</h3>
            <div className="font-list">
              {g.fonts.map((v) => (
                <button key={v} type="button" className="font-card" data-font={v} aria-pressed={font === v} aria-label={fontLabel(v)} onClick={() => pickFont(v)}>
                  <span className="font-name">{fontLabel(v)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        <div className="options-group" role="group" aria-label="Line spacing">
          <h3 className="options-heading">Line spacing</h3>
          <div className="options-choices">
            {SPACINGS.map(([v, l]) => <button key={v} type="button" aria-pressed={spacing === v} onClick={() => pickSpacing(v)}>{l}</button>)}
          </div>
        </div>
        <div className="options-group" role="group" aria-label="Highlights and notes">
          <h3 className="options-heading">Highlights and notes</h3>
          <div className="options-choices">
            <button type="button" onClick={() => setSyncOpen(true)}>Sync across devices</button>
            <Link className="options-link" href="/highlights" onClick={() => setOpen(false)}>My highlights</Link>
          </div>
          <label className="options-check">
            <input type="checkbox" checked={share} onChange={(e) => { setShare(e.target.checked); void setSharing(e.target.checked); }} />
            <span>Share my highlights and notes with the author, without my name</span>
          </label>
        </div>
        <SyncDialog open={syncOpen} onClose={() => setSyncOpen(false)} />
      </section>
    </>
  );
}
