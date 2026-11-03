"use client";
import { useEffect, useState } from "react";
import { setHeart } from "@/lib/hearts/actions";
import { isHearted, setHearted } from "@/lib/client/reading-memory";
import { heartsLabel } from "@/lib/format/hearts";
import HeartIcon from "./HeartIcon";

/* "Heart this story" toggle with the shared count beside it. */
export default function HeartButton({ slug, count, showCount = true, iconOnly = false }: { slug: string; count: number; showCount?: boolean; iconOnly?: boolean }) {
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
      <button type="button" className={iconOnly ? "heart-button heart-icon-only" : "heart-button"} aria-pressed={on} disabled={busy}
        aria-label={iconOnly ? (on ? "Hearted" : "Heart this story") : undefined} onClick={() => void toggle()}>
        <HeartIcon filled={on} />{!iconOnly && (on ? "Hearted" : "Heart this story")}
      </button>
      {showCount && !iconOnly && <span className="heart-count muted" aria-live="polite">{heartsLabel(total)}</span>}
    </span>
  );
}
