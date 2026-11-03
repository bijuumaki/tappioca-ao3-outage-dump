import { CODE_PATTERN, makeCode, normalizeCode } from "@/lib/notes/model";
import { codeExists, deleteSynced, syncMarks } from "@/lib/notes/sync-actions";
import { allMarks, saveMarks } from "@/lib/client/notes-store";
import { readPref, writePref } from "@/lib/client/prefs";

const CODE_KEY = "fic-site-sync-code";
const TIME_KEY = "fic-site-sync-time";
export const SYNC_EVENT = "tappioca:sync-changed";

const changed = () => window.dispatchEvent(new Event(SYNC_EVENT));

export function getCode(): string | null {
  const c = readPref(CODE_KEY);
  return c && CODE_PATTERN.test(c) ? c : null;
}
export function lastSynced(): number | null {
  const t = Number(readPref(TIME_KEY));
  return t > 0 ? t : null;
}

function setCode(code: string | null): void {
  writePref(CODE_KEY, code ?? "");
  writePref(TIME_KEY, "");
  changed();
}

export type Outcome = { ok: true } | { ok: false; error: string };

/* Sends this browser's highlights, takes back the merged list and keeps it. */
export async function syncNow(): Promise<Outcome> {
  const code = getCode();
  if (!code) return { ok: false, error: "Sync is off." };
  try {
    const res = await syncMarks(code, allMarks());
    if (!res.ok) return res;
    saveMarks(res.marks, true);
    writePref(TIME_KEY, String(Date.now()));
    changed();
    return { ok: true };
  } catch {
    return { ok: false, error: "Couldn't reach the server. Try again in a moment." };
  }
}

export async function turnOn(): Promise<Outcome> {
  setCode(makeCode((n) => crypto.getRandomValues(new Uint8Array(n))));
  return syncNow();
}

/* A code made on another device: this browser's highlights are merged into the saved ones. */
export async function useCode(input: string): Promise<Outcome> {
  const code = normalizeCode(input);
  if (!CODE_PATTERN.test(code)) return { ok: false, error: "A code has 16 letters and numbers, like 5JPE-H9QT-AN8F-F3JG." };
  if (!(await codeExists(code))) return { ok: false, error: "No highlights are saved under that code. Check it for typos." };
  setCode(code);
  return syncNow();
}

export function turnOff(): void {
  setCode(null);
}

export async function deleteCloudCopy(): Promise<Outcome> {
  const code = getCode();
  if (!code) return { ok: false, error: "Sync is off." };
  if (!(await deleteSynced(code))) return { ok: false, error: "Couldn't delete it. Try again in a moment." };
  setCode(null);
  return { ok: true };
}
