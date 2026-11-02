"use client";
import { useEffect, useRef, useState } from "react";
import { THEMES, writePref } from "@/lib/client/prefs";

/* The admin's Aa button: theme choice, saved separately from the public site's. */
export default function AdminOptions() {
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState("day");
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLElement>(null);

  useEffect(() => { setTheme(document.querySelector(".admin")?.getAttribute("data-admin-theme") ?? "day"); }, []);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!panel.current?.contains(t) && !button.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); button.current?.focus(); } };
    document.addEventListener("click", onClick);
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("click", onClick); document.removeEventListener("keydown", onKey); };
  }, [open]);

  function pick(v: string) {
    document.querySelector(".admin")?.setAttribute("data-admin-theme", v);
    writePref("fic-admin-theme", v);
    setTheme(v);
  }

  return (
    <>
      <button ref={button} type="button" className="a-aa" aria-label="Display options" aria-expanded={open} onClick={() => setOpen(!open)}>Aa</button>
      <section ref={panel} className="a-options" aria-label="Display options" hidden={!open}>
        <span>Theme</span>
        <div className="a-choices" role="group" aria-label="Theme">
          {THEMES.map(([v, l]) => <button key={v} type="button" aria-pressed={theme === v} onClick={() => pick(v)}>{l}</button>)}
        </div>
      </section>
    </>
  );
}

