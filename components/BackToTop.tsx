"use client";
import { useEffect, useState } from "react";
import { nextUpMode, shouldShowTop } from "@/lib/client/back-to-top";

export default function BackToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let upMode = false;
    const update = () => {
      const y = window.scrollY;
      const moved = y - lastY;
      if (Math.abs(moved) >= 8) lastY = y;
      upMode = nextUpMode({ prev: upMode, moved, y, vh: window.innerHeight });
      setShown(shouldShowTop({ width: window.innerWidth, y, vh: window.innerHeight, docHeight: document.documentElement.scrollHeight, upMode }));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, []);

  function toTop() {
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  }

  return (
    <button type="button" className="to-top" data-shown={shown} aria-label="Back to top" title="Back to top" onClick={toTop} tabIndex={shown ? 0 : -1}>
      <svg aria-hidden="true" viewBox="0 0 256 256" fill="currentColor"><path d="M205.66,138.34a8,8,0,0,1-11.32,11.32L136,91.31V224a8,8,0,0,1-16,0V91.31L61.66,149.66a8,8,0,0,1-11.32-11.32l72-72a8,8,0,0,1,11.32,0ZM216,32H40a8,8,0,0,0,0,16H216a8,8,0,0,0,0-16Z" /></svg>
    </button>
  );
}
