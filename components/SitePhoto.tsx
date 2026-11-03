"use client";
import { useEffect, useRef, useState } from "react";
import { amSignedInAsAdmin } from "@/lib/admin/page-actions";
import { uploadSitePhoto } from "@/lib/admin/photo-actions";
import { MAX_UPLOAD_BYTES, shrinkImage } from "@/lib/client/shrink-image";

/* The round photo on Home and About. Readers see the picture (or an empty circle). Only when Bijuu is signed in, an upload icon
   in the middle of the circle adds or changes the picture; it is shrunk in the browser first. */
export default function SitePhoto({ url }: { url: string | null }) {
  const [shown, setShown] = useState(url);
  const [admin, setAdmin] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { setShown(url); }, [url]);
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
      if (res.ok) setShown(res.url); else setError(res.error);
    } catch {
      setError("The picture didn’t upload. Try again.");
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <>
      <div className="photo">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {shown ? <img src={shown} alt="" /> : null}
        {admin && (
          <>
            <button type="button" className="photo-upload" disabled={busy} aria-label={shown ? "Change your photo" : "Add your photo"} title={shown ? "Change photo" : "Add photo"}
              onClick={() => input.current?.click()}>
              <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 16V4M7 9l5-5 5 5M4 15v4a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-4" /></svg>
            </button>
            <input ref={input} type="file" accept="image/*" hidden data-photo-input onChange={(e) => void pick(e.target.files?.[0])} />
          </>
        )}
      </div>
      {admin && error && <p className="photo-error" role="alert">{error}</p>}
      {admin && busy && <p className="photo-error muted" role="status">Adding photo…</p>}
    </>
  );
}
