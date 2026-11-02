"use client";
import { useCallback, useEffect, useState } from "react";
import { listVersions, restoreVersion, type Restored } from "@/lib/admin/version-actions";
import type { VersionRow } from "@/lib/admin/versions";

const REASON: Record<string, string> = { autosave: "autosaved", publish: "published", upload: "replaced by an upload", restore: "restored over" };

/* Earlier versions of this chapter. Restoring keeps what it replaces, so it can be undone. */
export default function VersionsPanel({ chapterId, flush, onRestored }: { chapterId: number; flush: () => Promise<boolean>; onRestored: (r: Restored) => void }) {
  const [rows, setRows] = useState<VersionRow[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => { listVersions(chapterId).then(setRows).catch(() => setError("Couldn’t load the versions.")); }, [chapterId]);
  useEffect(() => { if (open) load(); }, [open, load]);

  async function restore(id: number) {
    setBusy(true); setError(null);
    const saved = await flush();
    if (!saved) { setBusy(false); setError("Your latest writing didn’t save, so nothing was restored."); return; }
    const res = await restoreVersion(id).catch(() => null);
    setBusy(false);
    if (!res) { setError("Couldn’t restore that version. Try again."); return; }
    onRestored(res);
    load();
  }

  return (
    <details className="a-notes a-versions-box" onToggle={(e) => setOpen((e.currentTarget as HTMLDetailsElement).open)}>
      <summary>Earlier versions</summary>
      {error && <p className="a-alert" role="alert">{error}</p>}
      {open && rows.length === 0 && !error && <p className="a-muted">No earlier versions yet. One is kept when you publish, and now and then while you write.</p>}
      <ul className="a-versions">
        {rows.map((v) => (
          <li key={v.id} className="a-row">
            <span>{new Date(v.createdAt).toLocaleString("en-US", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })} · {REASON[v.reason] ?? v.reason} · {v.words.toLocaleString("en-US")} words</span>
            <button type="button" className="a-button" disabled={busy} onClick={() => void restore(v.id)}>Restore</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
