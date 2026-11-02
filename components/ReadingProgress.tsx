"use client";
import { useEffect, useRef, useState } from "react";
import { readPref, writePref } from "@/lib/client/prefs";

const KEY = "fic-site-progress";

function all(): Record<string, number> {
  try { return JSON.parse(readPref(KEY) ?? "{}") || {}; } catch { return {}; }
}

/* Remembers the furthest point reached in this chapter (0 to 1), in this browser only. Only moves forward. */
export default function ReadingProgress({ id, children }: { id: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [welcome, setWelcome] = useState<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pos = () => {
      const r = el.getBoundingClientRect();
      if (r.height <= 0) return 1;
      return Math.max(0, Math.min(1, (window.innerHeight * 0.5 - r.top) / r.height));
    };
    const saved = all()[id];
    if (typeof saved === "number" && saved > 0.02) {
      setWelcome(saved);
      const top = el.getBoundingClientRect().top + window.scrollY + saved * el.offsetHeight - window.innerHeight * 0.5;
      window.scrollTo(0, top);
    }
    let timer: ReturnType<typeof setTimeout> | null = null;
    const onScroll = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        const p = Math.round(pos() * 1000) / 1000;
        const data = all();
        if ((data[id] ?? 0) >= p) return;
        data[id] = p;
        writePref(KEY, JSON.stringify(data));
      }, 250);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (timer) clearTimeout(timer); };
  }, [id]);

  return (
    <>
      {welcome !== null && (
        <p className="progress-note" role="status">Welcome back. You had read about {Math.round(welcome * 100)}% of this chapter.</p>
      )}
      <div ref={ref}>{children}</div>
    </>
  );
}
