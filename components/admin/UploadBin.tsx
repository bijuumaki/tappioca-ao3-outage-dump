"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { getDriveStatus, importFromDrive, listDriveFiles, saveOriginalsToDrive } from "@/lib/admin/drive-actions";
import { createUploadUrls, processUploads } from "@/lib/admin/upload-actions";
import type { UploadResult } from "@/lib/admin/upload-process";
import { checkUploadRequest } from "@/lib/admin/upload-rules";
import { groupFiles } from "@/lib/convert/names";
import type { DriveFile } from "@/lib/drive/bridge";
import type { DriveStatus } from "@/lib/drive/flows";
import { browserClient } from "@/lib/supabase/browser";

export type BinFic = { id: number; slug: string; title: string; status: string; chapters: number; files: { filename: string; status: string; error: string | null }[] };
type UiResult = UploadResult & { drive?: string };

const ACCEPT = ".html,.htm,.md,.markdown,.txt,.docx,.epub";
const size = (n: number) => (n >= 1_048_576 ? `${(n / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function DropZone({ label, inputLabel, busy, onFiles }: { label: string; inputLabel: string; busy: boolean; onFiles: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className="a-drop" data-over={over || undefined}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy) onFiles([...e.dataTransfer.files]); }}>
      <p>{label}</p>
      <label className="a-button">{busy ? "Working…" : "Choose files"}
        <input ref={input} type="file" multiple accept={ACCEPT} aria-label={inputLabel} disabled={busy} aria-busy={busy}
          onChange={(e) => { const f = [...(e.target.files ?? [])]; if (input.current) input.current.value = ""; if (f.length) onFiles(f); }} />
      </label>
    </div>
  );
}

function driveLine(drive: DriveStatus | null): string {
  if (!drive) return "Google Drive: checking…";
  if (drive.state === "connected") return `Google Drive: connected to ${drive.folder}`;
  if (drive.state === "error") return `Google Drive: can’t reach it right now. ${drive.message}`;
  return "Google Drive: not connected yet. Uploads work as usual without it.";
}

export default function UploadBin({ fics }: { fics: BinFic[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [results, setResults] = useState<UiResult[]>([]);
  const [status, setStatus] = useState("");
  const [drive, setDrive] = useState<DriveStatus | null>(null);
  const [saveToDrive, setSaveToDrive] = useState(true);
  const [driveFiles, setDriveFiles] = useState<DriveFile[] | null>(null);
  const [truncated, setTruncated] = useState(false);
  const [folderFilter, setFolderFilter] = useState("");
  const [driveError, setDriveError] = useState<string | null>(null);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [target, setTarget] = useState("new");
  const connected = drive?.state === "connected";

  useEffect(() => { getDriveStatus().then(setDrive).catch(() => setDrive({ state: "error", message: "Couldn’t check." })); }, []);

  /* Chapters first, then (if asked) the originals go to Drive as their own step, so Drive can never block an upload. */
  async function withDrive(done: UploadResult[], sent: { name: string; path: string }[]): Promise<UiResult[]> {
    const rows: UiResult[] = done.map((r) => ({ ...r }));
    if (!connected || !saveToDrive) return rows;
    const byFic = new Map<number, { name: string; path: string }[]>();
    for (const r of rows) {
      const item = sent.find((s) => s.name === r.name);
      if (r.ok && r.ficId && item) byFic.set(r.ficId, [...(byFic.get(r.ficId) ?? []), item]);
    }
    for (const [ficId, items] of byFic) {
      setStatus("Saving originals to Google Drive…");
      const saved = await saveOriginalsToDrive(items, ficId).catch(() => items.map((i) => ({ name: i.name, saved: false, message: "couldn’t save to Google Drive: something went wrong." })));
      for (const s of saved) { const row = rows.find((r) => r.name === s.name && r.ficId === ficId); if (row) row.drive = s.message; }
    }
    return rows;
  }

  async function send(files: File[], ficId: number | null) {
    setProblems([]); setResults([]); setStatus("");
    const bad = checkUploadRequest(files.map((f) => ({ name: f.name, size: f.size })));
    if (bad.length) { setProblems(bad.map((b) => b.message)); return; }
    setBusy(true);
    try {
      setStatus("Sending…");
      const urls = await createUploadUrls(files.map((f) => ({ name: f.name, size: f.size })), ficId);
      if (!urls.ok) { setProblems([urls.error]); return; }
      const storage = browserClient().storage.from("uploads");
      const sent: { name: string; path: string }[] = [];
      const failed: UiResult[] = [];
      for (const [i, item] of urls.items.entries()) {
        setStatus(`Sending ${i + 1} of ${urls.items.length}…`);
        const up = await storage.uploadToSignedUrl(item.path, item.token, files[i]);
        if (up.error) failed.push({ name: item.name, ok: false, message: "couldn’t convert: the file didn’t send. Try again." });
        else sent.push({ name: item.name, path: item.path });
      }
      /* One fic's files per request, so a problem with one never loses or duplicates the others. */
      const done: UiResult[] = [];
      const groups = groupFiles(sent.map((s) => s.name));
      for (const [i, group] of groups.entries()) {
        setStatus(groups.length > 1 ? `Converting ${i + 1} of ${groups.length}…` : "Converting…");
        const items = group.files.map((f) => sent.find((s) => s.name === f.name)!);
        try { done.push(...(await withDrive((await processUploads(items, ficId)).results, items))); }
        catch { done.push(...items.map((it) => ({ name: it.name, ok: false, message: "couldn’t tell if this converted. Check the folders below before uploading it again." }))); }
      }
      setResults([...done, ...failed]);
      router.refresh();
    } catch {
      setProblems(["Something went wrong before the files were sent. Nothing was changed; try again."]);
    } finally {
      setBusy(false); setStatus("");
    }
  }

  async function showDriveFiles() {
    setDriveError(null); setBusy(true);
    const res = await listDriveFiles(folderFilter).catch(() => ({ ok: false as const, error: "Couldn’t read the Drive folder." }));
    setBusy(false);
    if (res.ok) { setDriveFiles(res.files); setTruncated(res.truncated); setPicked(new Set()); } else setDriveError(res.error);
  }

  async function importPicked() {
    const chosen = (driveFiles ?? []).filter((f) => picked.has(f.id));
    if (!chosen.length) return;
    setProblems([]); setResults([]); setBusy(true);
    const ficId = target === "new" ? null : Number(target);
    try {
      const out: UiResult[] = [];
      const groups = groupFiles(chosen.map((f) => f.name));
      for (const [i, group] of groups.entries()) {
        setStatus(groups.length > 1 ? `Importing ${i + 1} of ${groups.length}…` : "Importing…");
        const items = group.files.map((g) => chosen.find((f) => f.name === g.name)!).map((f) => ({ id: f.id, name: f.name }));
        try { out.push(...(await importFromDrive(items, ficId)).results); }
        catch { out.push(...items.map((it) => ({ name: it.name, ok: false, message: "couldn’t tell if this was imported. Check the folders below before trying again." }))); }
      }
      setResults(out); setPicked(new Set());
      router.refresh();
    } finally {
      setBusy(false); setStatus("");
    }
  }

  return (
    <div className="a-bin">
      <p className="a-drive-status" role="status">{driveLine(drive)}</p>
      {connected && (
        <label className="a-check">
          <input type="checkbox" checked={saveToDrive} onChange={(e) => setSaveToDrive(e.target.checked)} />
          Also save originals to Google Drive (for every upload on this screen)
        </label>
      )}

      <section className="a-section" aria-label="New fic from files">
        <h2 className="a-bar">New fic from files</h2>
        <p className="a-muted">Name chapters like <span className="keep-case">Title - 1.md</span>, <span className="keep-case">Title - 2.md</span> and they become one fic. An .epub becomes a whole fic. Everything arrives as a draft.</p>
        <DropZone label="Drop files here" inputLabel="Choose files for a new fic" busy={busy} onFiles={(f) => void send(f, null)} />
      </section>

      {connected && (
        <section className="a-section" aria-label="Import from Google Drive">
          <h2 className="a-bar">Import from Google Drive</h2>
          <p className="a-muted">Pick files from your Fic Library folder. They become draft chapters and stay where they are in Drive.</p>
          <div className="a-row">
            <label className="a-field">Import into
              <select aria-label="Import into" value={target} onChange={(e) => setTarget(e.target.value)}>
                <option value="new">A new fic</option>
                {fics.map((f) => <option key={f.id} value={f.id} className="keep-case">{f.title}</option>)}
              </select>
            </label>
            <label className="a-field">Only this folder (optional)
              <input aria-label="Only this folder" value={folderFilter} onChange={(e) => setFolderFilter(e.target.value)} placeholder="e.g. Resident Evil" />
            </label>
            <button type="button" className="a-button" disabled={busy} aria-busy={busy} onClick={() => void showDriveFiles()}>Show my Drive files</button>
          </div>
          {driveError && <p className="a-alert" role="alert">{driveError}</p>}
          {driveFiles && driveFiles.length === 0 && <p className="a-muted">No files I can read there yet. I can read .html, .md, .txt, .docx and .epub; Google Docs aren’t listed, so export them to .docx or .md first.</p>}
          {driveFiles && truncated && <p className="a-muted" role="note">Showing the first {driveFiles.length} files only. Type a folder name above and press “Show my Drive files” to see the rest.</p>}
          {driveFiles && driveFiles.length > 0 && (
            <>
              <ul className="a-drive-files">
                {driveFiles.map((f) => (
                  <li key={f.id}>
                    <label className="a-check">
                      <input type="checkbox" aria-label={f.path} checked={picked.has(f.id)}
                        onChange={(e) => setPicked((p) => { const n = new Set(p); if (e.target.checked) n.add(f.id); else n.delete(f.id); return n; })} />
                      <span className="keep-case">{f.path}</span> <span className="a-muted">{size(f.size)} · {new Date(f.modified).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Manila" })}</span>
                    </label>
                  </li>
                ))}
              </ul>
              <div className="a-row">
                <button type="button" className="a-button-primary" disabled={busy || picked.size === 0} onClick={() => void importPicked()}>Convert selected</button>
              </div>
            </>
          )}
        </section>
      )}

      {(status || problems.length > 0 || results.length > 0) && (
        <section className="a-section" aria-label="Upload results">
          {status && <p role="status">{status}</p>}
          {problems.length > 0 && <ul className="a-upload-problems">{problems.map((p, i) => <li key={i} className="a-alert" role="alert">{p}</li>)}</ul>}
          {results.length > 0 && (
            <ul className="a-results">
              {results.map((r, i) => (
                <li key={`${r.name}-${i}`} data-ok={r.ok}>
                  <span className="keep-case">{r.name}</span>: {r.message}
                  {r.drive && <> · {r.drive}</>}
                  {r.ok && r.ficId && <> · <Link href={`/admin/stories/${r.ficId}`} className="a-link">Open in editor</Link></>}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {fics.map((f) => (
        <section key={f.id} className="a-section" aria-label={`Folder ${f.title}`}>
          <h2 className="a-bar keep-case">{f.title}</h2>
          <p className="a-muted">fics/{f.slug}/ · {f.chapters === 1 ? "1 chapter" : `${f.chapters} chapters`} · {f.status}</p>
          {f.files.length > 0 && (
            <ul className="a-files">
              {f.files.map((file, i) => (
                <li key={i}><span className="keep-case">{file.filename}</span> <span className="a-muted">{file.status}{file.error ? `: ${file.error}` : ""}</span></li>
              ))}
            </ul>
          )}
          <DropZone label="Drop files for this fic" inputLabel={`Add files to ${f.title}`} busy={busy} onFiles={(files) => void send(files, f.id)} />
          <Link href={`/admin/stories/${f.id}`} className="a-link">Open in editor</Link>
        </section>
      ))}
    </div>
  );
}
