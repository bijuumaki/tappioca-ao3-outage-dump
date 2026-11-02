"use client";
import { useState } from "react";
import { publishChapter, scheduleChapter, unpublish, type PublishResult } from "@/lib/admin/actions";
import { formatDate } from "@/lib/format/dates";
import { saveDetailsNow } from "@/lib/client/details-saver";

type Status = "published" | "scheduled" | "draft";
const statusOf = (at: string | null): Status => (!at ? "draft" : Date.parse(at) > Date.now() ? "scheduled" : "published");

export default function PublishBar({ ficId, chapterId, publishAt, save }: {
  ficId: number; chapterId: number; publishAt: string | null; save: () => Promise<boolean>;
}) {
  const [at, setAt] = useState(publishAt);
  const [status, setStatus] = useState<Status>(statusOf(publishAt));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const [when, setWhen] = useState("");

  async function run(fn: () => Promise<PublishResult>) {
    setBusy(true); setError(null);
    const okSave = (await saveDetailsNow()) && (await save());
    if (!okSave) { setBusy(false); setError("Save didn’t go through, so nothing was published."); return; }
    const res = await fn().catch(() => ({ ok: false as const, error: "Something went wrong. Try again." }));
    setBusy(false);
    if (!res.ok) { setError(res.error); return; }
    setStatus(res.status); setAt(res.at); setScheduling(false);
  }

  async function preview() {
    const tab = window.open("", "_blank");
    const ok = (await saveDetailsNow()) && (await save());
    if (!tab) return;
    if (!ok) { tab.close(); setError("Save didn’t go through, so the preview would be out of date."); return; }
    tab.location.href = `/admin/stories/${ficId}/preview/${chapterId}`;
  }

  const label = status === "published" ? `Published${at ? ` · ${formatDate(at)}` : ""}`
    : status === "scheduled" ? `Scheduled · ${at ? new Date(at).toLocaleString("en-US", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }) : ""}`
    : "Draft";

  return (
    <div className="a-publish">
      <span className="a-pub-state" data-status={status}>{label}</span>
      <div className="a-row">
        <button type="button" className="a-button" disabled={busy} onClick={() => void save()}>Save draft</button>
        <button type="button" className="a-button" disabled={busy} onClick={() => void preview()}>Preview</button>
        {status === "draft" && <button type="button" className="a-button" disabled={busy} onClick={() => setScheduling(!scheduling)} aria-expanded={scheduling}>Schedule</button>}
        {status === "draft"
          ? <button type="button" className="a-button-primary" disabled={busy} onClick={() => void run(() => publishChapter(chapterId))}>Publish</button>
          : <button type="button" className="a-button" disabled={busy} onClick={() => void run(() => unpublish(chapterId))}>Unpublish</button>}
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
    </div>
  );
}
