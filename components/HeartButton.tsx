"use client";
import { useEffect, useState } from "react";
import { setHeart } from "@/lib/hearts/actions";
import { isHearted, setHearted } from "@/lib/client/reading-memory";

export function heartsLabel(n: number): string {
  return n === 1 ? "1 heart" : `${n} hearts`;
}

export function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 21s-7.5-4.6-9.5-9.3C1.2 8.6 3 5 6.4 5c2 0 3.5 1.1 4.3 2.5L12 9.2l1.3-1.7C14.1 6.1 15.6 5 17.6 5 21 5 22.8 8.6 21.5 11.7 19.5 16.4 12 21 12 21z" />
    </svg>
  );
}

/* "Heart this story" toggle with the shared count beside it. */
export default function HeartButton({ slug, count, showCount = true }: { slug: string; count: number; showCount?: boolean }) {
  const [on, setOn] = useState(false);
  const [total, setTotal] = useState(count);
  const [busy, setBusy] = useState(false);
  useEffect(() => setOn(isHearted(slug)), [slug]);

  async function toggle() {
    if (busy) return;
    const next = !on;
    setBusy(true);
    const res = await setHeart(slug, next).catch(() => null);
    setBusy(false);
    if (res === null) return;
    setOn(next); setHearted(slug, next); setTotal(res);
  }

  return (
    <span className="heart-row">
      <button type="button" className="heart-button" aria-pressed={on} disabled={busy} onClick={() => void toggle()}>
        <HeartIcon filled={on} />{on ? "Hearted" : "Heart this story"}
      </button>
      {showCount && <span className="heart-count muted" aria-live="polite">{heartsLabel(total)}</span>}
    </span>
  );
}
