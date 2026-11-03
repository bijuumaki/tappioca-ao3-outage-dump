"use client";
import { useEffect, useState } from "react";
import { getDriveStatus, listDriveFiles } from "@/lib/admin/drive-actions";
import { summarizeLibrary, type LibraryFic } from "@/lib/drive/library";

/* "Fics found in Google Drive": what is in the Fic Library folder, ready or with what to fix. Shown only when Drive is connected. */
export default function DriveLibrary() {
  const [connected, setConnected] = useState(false);
  const [fics, setFics] = useState<LibraryFic[] | null>(null);
  const [checked, setChecked] = useState<Date | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function check() {
    setBusy(true); setMessage("");
    const res = await listDriveFiles().catch(() => ({ ok: false as const, error: "Couldn’t read the Drive folder." }));
    setBusy(false);
    if (!res.ok) { setMessage(res.error); return; }
    setFics(summarizeLibrary(res.files));
    setChecked(new Date());
    setMessage(res.truncated ? "Checked Drive. The library is bigger than this list, so only the first files are shown." : "Checked Drive. The list below is up to date.");
  }

  useEffect(() => {
    getDriveStatus().then((s) => { if (s.state === "connected") { setConnected(true); void check(); } }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!connected) return null;
  const need = fics?.filter((x) => !x.ready).length ?? 0;
  return (
    <section aria-labelledby="drive-found" className="a-section">
      <h2 id="drive-found" className="a-bar">Fics found in Google Drive</h2>
      <p className="a-muted">Drop a file in your Drive folder, press “Check Drive again”, and it shows up here, ready or with what to fix. Name chapters like <span className="keep-case">Title - 1.md</span>, <span className="keep-case">Title - 2.md</span> so they group into one fic.</p>
      <div className="a-row">
        <div>
          <strong>{fics ? `${fics.length} ${fics.length === 1 ? "fic" : "fics"} found · ${need} ${need === 1 ? "needs" : "need"} attention` : "Checking…"}</strong>
          <div className="a-muted">{checked ? `Last checked ${checked.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}` : ""}</div>
        </div>
        <button type="button" className="a-button-primary" disabled={busy} onClick={() => void check()}>Check Drive again</button>
      </div>
      {message && <p role="status" className="a-muted">{message}</p>}
      {fics && (
        <ul className="a-drive-list">
          {fics.map((x) => (
            <li key={`${x.folder}/${x.title}`}>
              <div><strong className="keep-case">{x.title}</strong><div className="a-muted">{x.folder}</div><div className="a-muted keep-case">{x.fileLine}</div></div>
              <div><strong><span aria-hidden="true">{x.ready ? "✓ " : "! "}</span>{x.ready ? "Ready" : "Needs attention"}</strong><div className="a-muted">{x.note}</div></div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
