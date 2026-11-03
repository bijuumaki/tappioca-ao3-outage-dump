"use client";
import { useEffect, useRef, useState } from "react";
import { getPublishChecks, publishChapter, scheduleChapter, unpublish, type PublishChecksResult, type PublishResult } from "@/lib/admin/actions";
import { statusOf, type StoryStatus as Status } from "@/lib/admin/status";
import { formatDate } from "@/lib/format/dates";
import { saveDetailsNow } from "@/lib/client/details-saver";
import { EDITOR_EVENT } from "./EditorMenu";
import PublishCheck from "./PublishCheck";


export default function PublishBar({ ficId, chapterId, publishAt, save }: {
  ficId: number; chapterId: number; publishAt: string | null; save: () => Promise<boolean>;
}) {
  const [at, setAt] = useState(publishAt);
  const [status, setStatus] = useState<Status>(statusOf(publishAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [when, setWhen] = useState("");
  const publishButton = useRef<HTMLButtonElement>(null);
  const [review, setReview] = useState<Extract<PublishChecksResult, { ok: true }> | null>(null);

  async function run(fn: () => Promise<PublishResult>) {
    setBusy(true); setError(null);
    const okSave = (await saveDetailsNow()) && (await save());
    if (!okSave) { setBusy(false); setError("Save didn’t go through, so nothing was published."); return; }
    const res = await fn().catch(() => ({ ok: false as const, error: "Something went wrong. Try again." }));
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setStatus(res.status); setAt(res.at); setScheduling(false);
  }

  /* Publish asks first: save, read back what is saved, and show the publish check. */
  async function askPublish() {
    setBusy(true); setError(null);
    const okSave = (await saveDetailsNow()) && (await save());
    if (!okSave) { setBusy(false); setError("Save didn’t go through, so nothing was published."); return; }
    const res = await getPublishChecks(ficId).catch(() => ({ ok: false as const, error: "Something went wrong. Try again." }));
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setReview(res);
  }

  async function preview() {
    const tab = window.open("", "_blank");
    const ok = (await saveDetailsNow()) && (await save());
    if (!tab) return;
    if (!ok) { tab.close(); setError("Save didn’t go through, so the preview would be out of date."); return; }
    tab.location.href = `/admin/stories/${ficId}/preview/${chapterId}`;
  }

  /* The editor's File menu asks for Preview and Publish through here. */
  const latest = useRef({ preview, askPublish, status });
  latest.current = { preview, askPublish, status };
  useEffect(() => {
    const on = (e: Event) => {
      const what = (e as CustomEvent<string>).detail;
      if (what === "preview") void latest.current.preview();
      if (what === "publish" && latest.current.status === "draft") void latest.current.askPublish();
    };
    window.addEventListener(EDITOR_EVENT, on);
    return () => window.removeEventListener(EDITOR_EVENT, on);
  }, []);

  const label = status === "published" ? `Published${at ? ` · ${formatDate(at)}` : ""}`
    : status === "scheduled" ? `Scheduled · ${at ? new Date(at).toLocaleString("en-US", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }) : ""}`
    : "Draft";

  return (
    <div className="a-publish">
      <span className="a-pub-state" data-status={status}>{label}</span>
      <div className="a-row">
        <button type="button" className="a-button" disabled={busy} aria-busy={busy} onClick={() => void save()}>Save draft</button>
        <button type="button" className="a-button" disabled={busy} aria-busy={busy} onClick={() => void preview()}>Preview</button>
        {status === "draft" && <button type="button" className="a-button" disabled={busy} aria-busy={busy} onClick={() => setScheduling(!scheduling)} aria-expanded={scheduling}>Schedule</button>}
        {status === "draft"
          ? <button ref={publishButton} type="button" className="a-button-primary" disabled={busy} aria-busy={busy} onClick={() => void askPublish()}>Publish</button>
          : <button type="button" className="a-button" disabled={busy} aria-busy={busy} onClick={() => void run(() => unpublish(chapterId))}>Unpublish</button>}
      </div>
      {scheduling && (
        <div className="a-row a-schedule">
          <label className="a-field">Publish on (Philippine time)
            <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} aria-label="Publish on" />
          </label>
          <button type="button" className="a-button-primary" disabled={busy || !when} onClick={() => void run(() => scheduleChapter(chapterId, when))}>Confirm schedule</button>
        </div>
      )}
      {error && <p className="a-alert" role="alert">{error}</p>}
      {review && (
        <PublishCheck checks={review.checks} title={review.title} busy={busy} returnFocus={publishButton}
          onKeepEditing={() => setReview(null)}
          onSaveDraft={() => { setReview(null); void save(); }}
          onPublish={() => { setReview(null); void run(() => publishChapter(chapterId)); }} />
      )}
    </div>
  );
}
