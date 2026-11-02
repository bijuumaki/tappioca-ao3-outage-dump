"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { createUploadUrls, processUploads } from "@/lib/admin/upload-actions";
import { checkUploadRequest } from "@/lib/admin/upload-rules";
import { groupFiles } from "@/lib/convert/names";
import type { UploadResult } from "@/lib/admin/upload-process";
import { browserClient } from "@/lib/supabase/browser";

export type BinFic = { id: number; slug: string; title: string; status: string; chapters: number; files: { filename: string; status: string; error: string | null }[] };

const ACCEPT = ".html,.htm,.md,.markdown,.txt,.docx,.epub";

function DropZone({ label, inputLabel, busy, onFiles }: { label: string; inputLabel: string; busy: boolean; onFiles: (files: File[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  return (
    <div className="a-drop" data-over={over || undefined}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); if (!busy) onFiles([...e.dataTransfer.files]); }}>
      <p>{label}</p>
      <label className="a-button">{busy ? "Working…" : "Choose files"}
        <input ref={input} type="file" multiple accept={ACCEPT} aria-label={inputLabel} disabled={busy}
          onChange={(e) => { const f = [...(e.target.files ?? [])]; if (input.current) input.current.value = ""; if (f.length) onFiles(f); }} />
      </label>
    </div>
  );
}

export default function UploadBin({ fics }: { fics: BinFic[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [problems, setProblems] = useState<string[]>([]);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [status, setStatus] = useState("");

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
      const failed: UploadResult[] = [];
      for (const [i, item] of urls.items.entries()) {
        setStatus(`Sending ${i + 1} of ${urls.items.length}…`);
        const up = await storage.uploadToSignedUrl(item.path, item.token, files[i]);
        if (up.error) failed.push({ name: item.name, ok: false, message: "couldn’t convert: the file didn’t send. Try again." });
        else sent.push({ name: item.name, path: item.path });
      }
      /* One fic's files per request, so a problem with one never loses or duplicates the others. */
      const done: UploadResult[] = [];
      const groups = groupFiles(sent.map((s) => s.name));
      for (const [i, group] of groups.entries()) {
        setStatus(groups.length > 1 ? `Converting ${i + 1} of ${groups.length}…` : "Converting…");
        const items = group.files.map((f) => sent.find((s) => s.name === f.name)!);
        try { done.push(...(await processUploads(items, ficId)).results); }
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

  return (
    <div className="a-bin">
      <section className="a-section" aria-label="New fic from files">
        <h2 className="a-bar">New fic from files</h2>
        <p className="a-muted">Name chapters like <span className="keep-case">Title - 1.md</span>, <span className="keep-case">Title - 2.md</span> and they become one fic. An .epub becomes a whole fic. Everything arrives as a draft.</p>
        <DropZone label="Drop files here" inputLabel="Choose files for a new fic" busy={busy} onFiles={(f) => void send(f, null)} />
      </section>

      {(status || problems.length > 0 || results.length > 0) && (
        <section className="a-section" aria-label="Upload results">
          {status && <p role="status">{status}</p>}
          {problems.length > 0 && <ul className="a-upload-problems">{problems.map((p, i) => <li key={i} className="a-alert" role="alert">{p}</li>)}</ul>}
          {results.length > 0 && (
            <ul className="a-results">
              {results.map((r, i) => (
                <li key={`${r.name}-${i}`} data-ok={r.ok}>
                  <span className="keep-case">{r.name}</span>: {r.message}
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
