"use client";
import { useActionState } from "react";
import { saveStoryDetails, type SaveState } from "@/lib/admin/actions";
import { RATING_OPTIONS } from "@/lib/admin/story-form";
import type { Rating } from "@/lib/content/types";

export type DetailsValues = {
  summary: string; rating: Rating; fandom: string; relationships: string; characters: string; warnings: string; tags: string;
};

export default function StoryDetails({ ficId, values, fandoms }: { ficId: number; values: DetailsValues; fandoms: string[] }) {
  const [state, action, pending] = useActionState<SaveState, FormData>(saveStoryDetails.bind(null, ficId), { ok: false, savedAt: null, error: null });
  return (
    <form id="details-form" action={action} className="a-section" aria-label="Story details">
      <h2 className="a-bar">Story details</h2>
      <label className="a-field">Fandom
        <input name="fandom" list="fandom-options" defaultValue={values.fandom} placeholder="Type or pick a fandom" />
        <datalist id="fandom-options">{fandoms.map((f) => <option key={f} value={f} />)}</datalist>
      </label>
      <label className="a-field">Rating
        <select name="rating" defaultValue={values.rating}>
          {RATING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </label>
      <label className="a-field">Relationships
        <input name="relationships" defaultValue={values.relationships} placeholder="Character/Character" />
      </label>
      <label className="a-field">Characters
        <input name="characters" defaultValue={values.characters} placeholder="Separate with commas" />
      </label>
      <label className="a-field">Warnings
        <input name="warnings" defaultValue={values.warnings} placeholder="Separate with commas" />
      </label>
      <label className="a-field">Summary
        <textarea name="summary" rows={4} defaultValue={values.summary} placeholder="What readers see on the fic card" />
      </label>
      <label className="a-field">Tags
        <input name="tags" defaultValue={values.tags} placeholder="Separate with commas" />
      </label>
      <div className="a-row">
        <button type="submit" className="a-button" disabled={pending}>{pending ? "Saving…" : "Save details"}</button>
        {state.ok && <span className="a-saved a-muted" role="status">Saved</span>}
        {state.error && <span className="a-alert" role="alert">{state.error}</span>}
      </div>
    </form>
  );
}
