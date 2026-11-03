"use client";
import { useEffect, useRef, useState } from "react";
import { amSignedInAsAdmin } from "@/lib/admin/page-actions";
import { uploadSitePhoto } from "@/lib/admin/photo-actions";
import { MAX_UPLOAD_BYTES, shrinkImage } from "@/lib/client/shrink-image";

/* The round photo on Home and About. Readers see the picture (or an empty circle). When Bijuu is signed in, a button under it
   adds or changes the picture; it is shrunk in the browser first. */
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
      </div>
      {admin && (
        <div className="photo-edit">
          <button type="button" className="story-secondary" disabled={busy} onClick={() => input.current?.click()}>
            {busy ? "Adding photo…" : shown ? "Change photo" : "Add your photo"}
          </button>
          <input ref={input} type="file" accept="image/*" hidden data-photo-input onChange={(e) => void pick(e.target.files?.[0])} />
          {error && <p className="photo-error" role="alert">{error}</p>}
        </div>
      )}
    </>
  );
}
