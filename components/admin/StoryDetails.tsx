"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { saveStoryDetails } from "@/lib/admin/actions";
import { RATING_OPTIONS } from "@/lib/admin/story-form";
import { registerDetailsSaver } from "@/lib/client/details-saver";
import { STATUS_LABELS, type FicStatus, type Rating } from "@/lib/content/types";

export type DetailsValues = {
  summary: string; rating: Rating; fandom: string; relationships: string; characters: string; warnings: string; tags: string;
  status: FicStatus; planned: string;
};
type State = "idle" | "saving" | "saved" | "error";

/* Saves on its own 2 seconds after typing stops, on "Save details", and before Publish/Preview.
   The story title field sits in the editor area but belongs to this form (form="details-form"). */
export default function StoryDetails({ ficId, values, fandoms }: { ficId: number; values: DetailsValues; fandoms: string[] }) {
  const form = useRef<HTMLFormElement>(null);
  const dirty = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [state, setState] = useState<State>("idle");
  const [error, setError] = useState<string | null>(null);

  const inFlight = useRef<Promise<boolean> | null>(null);

  /* Waits for a save already under way, so Publish never runs ahead of the title it depends on. */
  const save = useCallback(async (): Promise<boolean> => {
    if (timer.current) clearTimeout(timer.current);
    if (inFlight.current) {
      const ok = await inFlight.current;
      if (!dirty.current) return ok;
    }
    if (!form.current || !dirty.current) return true;
    dirty.current = false;
    setState("saving");
    const run = saveStoryDetails(ficId, { ok: false, savedAt: null, error: null }, new FormData(form.current))
      .catch(() => ({ ok: false, savedAt: null, error: "Couldn’t save. Try again." }))
      .then((res) => {
        if (res.ok) { setState("saved"); setError(null); return true; }
        dirty.current = true;
        setState("error"); setError(res.error);
        return false;
      });
    inFlight.current = run;
    try { return await run; } finally { if (inFlight.current === run) inFlight.current = null; }
  }, [ficId]);

  useEffect(() => {
    registerDetailsSaver(save);
    const onEdit = (e: Event) => {
      const t = e.target as HTMLInputElement | null;
      if (!t || t.form !== form.current) return;
      dirty.current = true;
      setState("idle");
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void save(), 2000);
    };
    document.addEventListener("input", onEdit);
    document.addEventListener("change", onEdit);
    const flush = () => { if (dirty.current) void save(); };
    window.addEventListener("pagehide", flush);
    return () => {
      registerDetailsSaver(null);
      document.removeEventListener("input", onEdit);
      document.removeEventListener("change", onEdit);
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, [save]);

  return (
    <form ref={form} id="details-form" className="a-section" aria-label="Story details"
      onSubmit={(e) => { e.preventDefault(); dirty.current = true; void save(); }}>
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
      <label className="a-field">Status
        <select name="status" defaultValue={values.status}>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </label>
      <label className="a-field">Planned chapters
        <input name="planned" type="number" inputMode="numeric" min={1} max={999} defaultValue={values.planned} placeholder="Leave blank if unsure (shows ?)" />
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
        <button type="submit" className="a-button" disabled={state === "saving"}>{state === "saving" ? "Saving…" : "Save details"}</button>
        {state === "saved" && <span className="a-saved a-muted" role="status">Saved</span>}
        {error && <span className="a-alert" role="alert">{error}</span>}
      </div>
    </form>
  );
}
