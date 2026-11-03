"use client";
import { useEffect, useState } from "react";
import { setHeart } from "@/lib/hearts/actions";
import { isHearted, setHearted } from "@/lib/client/reading-memory";
import HeartIcon from "./HeartIcon";

/* "Like" toggle (canvas v135: no count is shown; the shared count is still kept on the server). */
export default function HeartButton({ slug, iconOnly = false }: { slug: string; iconOnly?: boolean }) {
  const [on, setOn] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => setOn(isHearted(slug)), [slug]);

  async function toggle() {
    if (busy) return;
    const next = !on;
    setBusy(true);
    const res = await setHeart(slug, next).catch(() => null);
    setBusy(false);
    if (res === null) return;
    setOn(next); setHearted(slug, next);
  }

  const label = on ? "Liked" : "Like";
  return (
    <button type="button" className={iconOnly ? "heart-button heart-icon-only" : "heart-button"} aria-pressed={on} disabled={busy}
      aria-label={iconOnly ? label : undefined} onClick={() => void toggle()}>
      <HeartIcon filled={on} />{!iconOnly && label}
    </button>
  );
}
