"use client";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

export const NAV_START_EVENT = "nav:start";

/* For navigation that doesn't come from a link click (the chapter dropdown). */
export function startNavProgress(): void {
  window.dispatchEvent(new Event(NAV_START_EVENT));
}

type Phase = "idle" | "loading" | "done";

/* A thin line at the top of the page and a waiting cursor from the moment a link is pressed until the next page arrives. */
export default function NavProgress() {
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>("idle");
  const timers = useRef<number[]>([]);

  function clearTimers() { timers.current.forEach((t) => window.clearTimeout(t)); timers.current = []; }

  function start() {
    clearTimers();
    setPhase("loading");
    timers.current.push(window.setTimeout(() => setPhase("idle"), 15000)); // never leave the cursor stuck
  }

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (url.pathname === window.location.pathname && url.search === window.location.search) return; // same page or only a #hash
      start();
    }
    window.addEventListener("click", onClick);
    window.addEventListener(NAV_START_EVENT, start);
    return () => { window.removeEventListener("click", onClick); window.removeEventListener(NAV_START_EVENT, start); clearTimers(); };
  }, []);

  // The new page has arrived: finish the line, then hide it.
  useEffect(() => {
    setPhase((p) => (p === "loading" ? "done" : p));
  }, [pathname]);

  useEffect(() => {
    if (phase !== "done") return;
    clearTimers();
    timers.current.push(window.setTimeout(() => setPhase("idle"), 400));
  }, [phase]);

  useEffect(() => {
    if (phase === "loading") document.documentElement.setAttribute("data-navigating", "true");
    else document.documentElement.removeAttribute("data-navigating");
  }, [phase]);

  return <div className="nav-progress" data-phase={phase} aria-hidden="true" />;
}
