"use client";
import { useEffect, useState } from "react";
import { writePref } from "@/lib/client/prefs";

function isDark(): boolean {
  const t = document.documentElement.getAttribute("data-theme");
  if (t) return t === "dark";
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export default function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(isDark()), []);

  function toggle() {
    const next = isDark() ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", next);
    writePref("fic-site-theme", next);
    setDark(next === "dark");
  }

  return (
    <button className="tool" id="theme-toggle" type="button" aria-label="Toggle dark mode" aria-pressed={dark} onClick={toggle}>
      <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M27 30A13 13 0 1 1 15.5 8a10.5 10.5 0 0 0 11.5 22z" />
      </svg>
      <svg className="icon-sun" viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="20" cy="20" r="7" />
        <path d="M20 4v4M20 32v4M4 20h4M32 20h4M8.7 8.7l2.8 2.8M28.5 28.5l2.8 2.8M31.3 8.7l-2.8 2.8M11.5 28.5l-2.8 2.8" />
      </svg>
    </button>
  );
}
