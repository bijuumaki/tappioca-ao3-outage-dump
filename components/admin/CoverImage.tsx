"use client";
import { useActionState, useRef } from "react";
import { removeCover, uploadCover, type SaveState } from "@/lib/admin/actions";

export default function CoverImage({ ficId, url }: { ficId: number; url: string | null }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(uploadCover.bind(null, ficId), { ok: false, savedAt: null, error: null });
  const form = useRef<HTMLFormElement>(null);
  return (
    <div className="a-section" aria-label="Cover image">
      <span className="a-field-label">Cover image (optional)</span>
      <div className="a-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {url && <img src={url} alt="Cover preview" />}
      </div>
      <div className="a-row">
        <form ref={form} action={action} className="a-upload">
          <label className={pending ? "a-button a-busy" : "a-button"}>{pending ? "Uploading…" : "Upload image"}
            <input type="file" name="cover" accept="image/*" onChange={() => form.current?.requestSubmit()} />
          </label>
        </form>
        {url && <form action={removeCover.bind(null, ficId)}><button type="submit" className="a-button">Remove</button></form>}
      </div>
      {state.error ? <span className="a-alert" role="alert">{state.error}</span> : <span className="a-muted">No image? The card uses a plain color from the theme.</span>}
    </div>
  );
}
