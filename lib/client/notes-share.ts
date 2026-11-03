import { allMarks } from "@/lib/client/notes-store";
import { readPref, writePref } from "@/lib/client/prefs";
import { shareMarks, withdrawShared } from "@/lib/notes/share-actions";

/* Highlights and notes are shared with the author by default, without a name: this browser has a random id, nothing else.
   A reader can turn it off, which also takes their shared marks back off the server. */
const ID_KEY = "fic-site-reader";
const OFF_KEY = "fic-site-share-off";
const AT_KEY = "fic-site-shared-at";
export const SHARE_EVENT = "tappioca:share-changed";

export function sharing(): boolean {
  return readPref(OFF_KEY) !== "1";
}

function readerId(): string {
  const have = readPref(ID_KEY);
  if (have && /^[a-z0-9]{16,40}$/.test(have)) return have;
  const id = Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => (b % 36).toString(36)).join("");
  writePref(ID_KEY, id);
  return id;
}

/* Sends marks changed since the last send (all of them when `all`). */
export async function pushShared(all = false): Promise<void> {
  if (!sharing()) return;
  const since = all ? 0 : Number(readPref(AT_KEY)) || 0;
  const pending = allMarks().filter((m) => m.updated > since);
  if (pending.length === 0) return;
  const stamp = Math.max(...pending.map((m) => m.updated));
  try {
    for (let i = 0; i < pending.length; i += 200) {
      if (!(await shareMarks(readerId(), pending.slice(i, i + 200)))) return;
    }
    writePref(AT_KEY, String(stamp));
  } catch { /* try again on the next change */ }
}

export async function setSharing(on: boolean): Promise<void> {
  writePref(OFF_KEY, on ? "" : "1");
  window.dispatchEvent(new Event(SHARE_EVENT));
  if (on) { writePref(AT_KEY, ""); await pushShared(true); return; }
  try { await withdrawShared(readerId()); } catch { /* nothing more to do */ }
  writePref(AT_KEY, "");
}
