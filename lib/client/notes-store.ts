import { cleanMarks, mergeMarks, newId, type HlColor, type Mark } from "@/lib/notes/model";
import { readPref, writePref } from "@/lib/client/prefs";

/* Highlights and notes in this browser. Every change fires "tappioca:notes-changed" so the page, the list and sync stay current. */
const KEY = "fic-site-notes";
export const NOTES_EVENT = "tappioca:notes-changed";

const random = (n: number) => crypto.getRandomValues(new Uint8Array(n));

export function allMarks(): Mark[] {
  try { return cleanMarks(JSON.parse(readPref(KEY) ?? "[]")); } catch { return []; }
}

export function liveMarks(): Mark[] {
  return allMarks().filter((m) => !m.deleted);
}

export function marksFor(slug: string, n: number): Mark[] {
  return liveMarks().filter((m) => m.slug === slug && m.n === n);
}

/* quiet: the change came from sync itself, so it must not trigger another sync. */
export function saveMarks(marks: Mark[], quiet = false): void {
  writePref(KEY, JSON.stringify(marks));
  window.dispatchEvent(new CustomEvent(NOTES_EVENT, { detail: { quiet } }));
}

export function upsertMark(mark: Mark): void {
  saveMarks(mergeMarks(allMarks(), [{ ...mark, updated: Date.now() }]));
}

export function addMark(base: Omit<Mark, "id" | "updated" | "note" | "color">, color: HlColor, note = ""): Mark {
  const mark: Mark = { ...base, id: newId(random), color, note, updated: Date.now() };
  upsertMark(mark);
  return mark;
}

export function deleteMark(id: string): void {
  const m = allMarks().find((x) => x.id === id);
  if (m) upsertMark({ ...m, deleted: true, note: "" });
}
