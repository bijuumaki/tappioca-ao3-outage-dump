"use client";
import { useEffect, useState } from "react";
import { createPreviewLink, listPreviewLinks, revokePreviewLink, type PreviewLink } from "@/lib/admin/preview-links";

/* Secret links so a beta reader can read this chapter before it is published. */
export default function PreviewLinks({ chapterId }: { chapterId: number }) {
  const [links, setLinks] = useState<PreviewLink[]>([]);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { listPreviewLinks(chapterId).then(setLinks).catch(() => {}); }, [chapterId]);

  async function create() {
    setBusy(true); setError(null);
    const link = await createPreviewLink(chapterId).catch(() => null);
    setBusy(false);
    if (link) setLinks((l) => [link, ...l]); else setError("Couldn’t make a link. Try again.");
  }
  async function revoke(token: string) {
    await revokePreviewLink(token).catch(() => {});
    setLinks((l) => l.filter((x) => x.token !== token));
  }
  async function copy(url: string) {
    try { await navigator.clipboard.writeText(url); setCopied(url); setTimeout(() => setCopied(null), 1500); } catch { /* the address is selectable instead */ }
  }

  return (
    <details className="a-notes a-share">
      <summary>Share a preview link</summary>
      <p className="a-muted">Anyone with the link can read this chapter, even though it isn’t published. Revoke it when you’re done.</p>
      <div className="a-row"><button type="button" className="a-button" disabled={busy} aria-busy={busy} onClick={() => void create()}>Create link</button></div>
      {error && <p className="a-alert" role="alert">{error}</p>}
      <ul className="a-links">
        {links.map((l) => (
          <li key={l.token} className="a-row">
            <input readOnly className="a-preview-url" aria-label="Preview link" value={l.url} onFocus={(e) => e.currentTarget.select()} />
            <button type="button" className="a-button" onClick={() => void copy(l.url)}>{copied === l.url ? "Copied" : "Copy"}</button>
            <button type="button" className="a-button" onClick={() => void revoke(l.token)}>Revoke</button>
          </li>
        ))}
      </ul>
    </details>
  );
}
