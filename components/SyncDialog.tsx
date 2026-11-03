"use client";
import { useEffect, useRef, useState } from "react";
import { deleteCloudCopy, getCode, lastSynced, SYNC_EVENT, syncNow, turnOff, turnOn, joinWithCode } from "@/lib/client/notes-sync";

function ago(t: number | null): string {
  if (!t) return "Not synced yet";
  const s = Math.round((Date.now() - t) / 1000);
  if (s < 30) return "Synced just now";
  if (s < 3600) return `Synced ${Math.max(1, Math.round(s / 60))} min ago`;
  return `Synced ${new Date(t).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}`;
}

/* "Sync across devices": a private code, no account. The same code on another device brings the same highlights and notes. */
export default function SyncDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [code, setCode] = useState<string | null>(null);
  const [time, setTime] = useState<number | null>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const read = () => { setCode(getCode()); setTime(lastSynced()); };
    read();
    window.addEventListener(SYNC_EVENT, read);
    return () => window.removeEventListener(SYNC_EVENT, read);
  }, []);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
    if (open) { setMessage(""); setTyped(""); }
  }, [open]);

  async function run(job: () => Promise<{ ok: boolean; error?: string }>, done = "") {
    setBusy(true); setMessage("");
    const res = await job();
    setBusy(false);
    setMessage(res.ok ? done : (res.error ?? "Something went wrong."));
  }
  async function copy() {
    try { await navigator.clipboard.writeText(code ?? ""); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { setMessage("Couldn't copy. Select the code and copy it by hand."); }
  }

  return (
    <dialog ref={ref} className="sync-dialog" aria-labelledby="sync-title" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}>
      <div className="sync-head">
        <h2 id="sync-title">Sync across devices</h2>
        <button type="button" className="options-close" aria-label="Close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 4l10 10M14 4L4 14" /></svg>
        </button>
      </div>
      <p>Your highlights and notes are saved in this browser. Use the same private code on your other devices to keep them the same everywhere.</p>
      {code ? (
        <>
          <p className="sync-label" id="sync-code-label">Your sync code</p>
          <div className="sync-code">
            <code aria-labelledby="sync-code-label">{code}</code>
            <button type="button" className="sync-icon" aria-label={copied ? "Copied" : "Copy code"} onClick={copy}>{copied ? "✓" : "⧉"}</button>
          </div>
          <p className="sync-status" role="status">{busy ? "Syncing…" : message || ago(time)}</p>
          <div className="sync-buttons">
            <button type="button" className="sync-primary" disabled={busy} onClick={() => run(syncNow)}>Sync now</button>
            <button type="button" disabled={busy} onClick={() => { turnOff(); setMessage(""); }}>Turn off sync</button>
            <button type="button" className="sync-link" disabled={busy} onClick={() => { if (confirm("Delete the copy kept online? Highlights stay on the devices that have them.")) run(deleteCloudCopy, "Online copy deleted."); }}>Delete the online copy</button>
          </div>
        </>
      ) : (
        <>
          <div className="sync-buttons">
            <button type="button" className="sync-primary" disabled={busy} onClick={() => run(turnOn)}>Turn on sync (make a code)</button>
          </div>
          <form className="sync-use" onSubmit={(e) => { e.preventDefault(); run(() => joinWithCode(typed)); }}>
            <label htmlFor="sync-typed" className="sync-label">Or use a code from another device</label>
            <input id="sync-typed" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="XXXX-XXXX-XXXX-XXXX" autoComplete="off" autoCapitalize="characters" spellCheck={false} />
            <button type="submit" disabled={busy || !typed.trim()}>Use this code</button>
          </form>
          {message && <p className="sync-status" role="alert">{message}</p>}
        </>
      )}
      <p className="sync-note">Anyone with your code can see and change your highlights and notes, so keep it private. The code isn&apos;t stored on the server, only a scrambled version of it. There are no accounts.</p>
    </dialog>
  );
}
