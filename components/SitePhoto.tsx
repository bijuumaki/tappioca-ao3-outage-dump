"use client";
import { useEffect, useRef, useState } from "react";
import { amSignedInAsAdmin } from "@/lib/admin/page-actions";
import { savePhotoFrame, uploadSitePhoto } from "@/lib/admin/photo-actions";
import { MAX_UPLOAD_BYTES, shrinkImage } from "@/lib/client/shrink-image";
import { ZOOM_MAX, ZOOM_MIN } from "@/lib/content/photo";

export type SitePhotoProps = { url: string; zoom: number; x: number; y: number } | null;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

/* The round photo on Home and About. Readers see the picture (or an empty circle). Only when Bijuu is signed in, an upload icon
   in the middle of the circle adds or changes the picture (shrunk in the browser first), and a second icon lets her zoom and
   move it inside the circle. */
export default function SitePhoto({ photo }: { photo: SitePhotoProps }) {
  const [url, setUrl] = useState(photo?.url ?? null);
  const [frame, setFrame] = useState({ zoom: photo?.zoom ?? 1, x: photo?.x ?? 50, y: photo?.y ?? 50 });
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  const circle = useRef<HTMLDivElement>(null);
  const drag = useRef<{ px: number; py: number; x: number; y: number } | null>(null);

  useEffect(() => { setUrl(photo?.url ?? null); setFrame({ zoom: photo?.zoom ?? 1, x: photo?.x ?? 50, y: photo?.y ?? 50 }); }, [photo?.url, photo?.zoom, photo?.x, photo?.y]);
  useEffect(() => {
    let live = true;
    amSignedInAsAdmin().then((yes) => { if (live) setAdmin(yes); }).catch(() => undefined);
    return () => { live = false; };
  }, []);

  async function pick(file: File | undefined) {
    if (!file) return;
    setError(null); setBusy(true);
    try {
      const small = await shrinkImage(file);
      if (small.size > MAX_UPLOAD_BYTES) { setError("That picture is still over 4 MB after shrinking. Try a smaller one."); return; }
      const form = new FormData();
      form.set("photo", small);
      const res = await uploadSitePhoto(form);
      if (res.ok) { setUrl(res.url); setFrame({ zoom: res.frame.zoom, x: res.frame.x, y: res.frame.y }); setAdjusting(true); } else setError(res.error);
    } catch {
      setError("The picture didn’t upload. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function done() {
    setBusy(true); setError(null);
    const res = await savePhotoFrame(frame).catch(() => ({ ok: false }));
    setBusy(false);
    if (res.ok) setAdjusting(false); else setError("The change didn’t save. Try again.");
  }

  const move = (dx: number, dy: number) => setFrame((f) => ({ ...f, x: clamp(f.x + dx, 0, 100), y: clamp(f.y + dy, 0, 100) }));
  function onPointerDown(e: React.PointerEvent) {
    if (!adjusting) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, x: frame.x, y: frame.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current; const w = circle.current?.clientWidth;
    if (!d || !w) return;
    /* Dragging the picture right shows more of its left side, so the kept point moves the other way. */
    setFrame((f) => ({ ...f, x: clamp(d.x - ((e.clientX - d.px) / w) * (100 / f.zoom), 0, 100), y: clamp(d.y - ((e.clientY - d.py) / w) * (100 / f.zoom), 0, 100) }));
  }
  function onKeyDown(e: React.KeyboardEvent) {
    if (!adjusting) return;
    const step = 4 / frame.zoom;
    if (e.key === "ArrowLeft") { e.preventDefault(); move(-step, 0); }
    else if (e.key === "ArrowRight") { e.preventDefault(); move(step, 0); }
    else if (e.key === "ArrowUp") { e.preventDefault(); move(0, -step); }
    else if (e.key === "ArrowDown") { e.preventDefault(); move(0, step); }
  }

  const imgStyle = { objectPosition: `${frame.x}% ${frame.y}%`, transform: `scale(${frame.zoom})`, transformOrigin: `${frame.x}% ${frame.y}%` };
  return (
    <>
      <div ref={circle} className={adjusting ? "photo photo-adjusting" : "photo"} {...(adjusting ? { tabIndex: 0, role: "group", "aria-label": "Photo position. Drag it or use the arrow keys." } : {})}
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={() => { drag.current = null; }} onKeyDown={onKeyDown}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url ? <img src={url} alt="" style={imgStyle} draggable={false} /> : null}
        {admin && !adjusting && (
          <span className="photo-tools">
            <button type="button" className="photo-upload" disabled={busy} aria-busy={busy} aria-label={url ? "Change your photo" : "Add your photo"} title={url ? "Change photo" : "Add photo"}
              onClick={() => input.current?.click()}>
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></svg>
            </button>
            {url && (
              <button type="button" className="photo-upload" aria-label="Zoom and move your photo" title="Zoom and move" onClick={() => setAdjusting(true)}>
                <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="6" /><path d="m20 20-4.2-4.2M8.5 11h5M11 8.5v5" /></svg>
              </button>
            )}
          </span>
        )}
        {admin && <input ref={input} type="file" accept="image/*" hidden data-photo-input onChange={(e) => void pick(e.target.files?.[0])} />}
      </div>
      {admin && adjusting && (
        <div className="photo-adjust">
          <label>Zoom
            <input type="range" min={ZOOM_MIN} max={ZOOM_MAX} step={0.05} value={frame.zoom} onChange={(e) => setFrame((f) => ({ ...f, zoom: Number(e.target.value) }))} />
          </label>
          <p className="muted">Drag the photo to move it, or click it and use the arrow keys.</p>
          <button type="button" className="story-primary" disabled={busy} aria-busy={busy} onClick={() => void done()}>Done</button>
        </div>
      )}
      {admin && error && <p className="photo-error" role="alert">{error}</p>}
      {admin && busy && !adjusting && <p className="photo-error muted" role="status">Adding photo…</p>}
    </>
  );
}
