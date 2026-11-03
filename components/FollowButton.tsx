"use client";
import { useState } from "react";

const MESSAGE = "Feed link copied. Paste it into your feed reader.";

/* Copies a feed link. `path` is the site-relative address of the feed. */
export default function FollowButton({ path, label, variant = "button" }: { path: string; label: string; variant?: "button" | "link" }) {
  const [msg, setMsg] = useState("");
  async function copy() {
    const url = new URL(path, window.location.origin).toString();
    try { await navigator.clipboard.writeText(url); setMsg(MESSAGE); }
    catch { setMsg(`Copy this feed link: ${url}`); }
  }
  return (
    <span className="follow">
      {variant === "link"
        ? <a href={path} className="follow-link" onClick={(e) => { e.preventDefault(); void copy(); }}>{label}</a>
        : (
          <button type="button" className="heart-button" onClick={() => void copy()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M5 5a14 14 0 0 1 14 14M5 11a8 8 0 0 1 8 8" /><circle cx="6" cy="18" r="1.5" fill="currentColor" /></svg>{label}
          </button>
        )}
      <span role="status" className="follow-status muted">{msg}</span>
    </span>
  );
}
