/* Highlights and notes. They live in the reader's browser; with a sync code they are also kept (merged) on the server.
   This file is plain logic shared by the browser and the server, so it is tested on its own. */

export const HL_COLORS = ["yellow", "pink", "green", "blue"] as const;
export type HlColor = (typeof HL_COLORS)[number];

export type Mark = {
  id: string;
  slug: string;
  n: number;
  /* Character offsets inside the chapter text; the quote lets us find the spot again if the text moved. */
  start: number;
  end: number;
  quote: string;
  color: HlColor;
  note: string;
  /* Story title and chapter label, kept so the "My highlights" page needs no lookup. */
  fic: string;
  ch: string;
  updated: number;
  deleted?: true;
};

export const LIMITS = { marks: 2000, note: 2000, quote: 600, label: 200 } as const;
const TOMBSTONE_DAYS = 90;

const ID = /^[a-z0-9]{6,32}$/;
const SLUG = /^[a-z0-9-]{1,200}$/;

function clean(raw: unknown): Mark | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const { id, slug, n, start, end, quote, color, note, fic, ch, updated, deleted } = r;
  if (typeof id !== "string" || !ID.test(id) || typeof slug !== "string" || !SLUG.test(slug)) return null;
  if (!Number.isInteger(n) || (n as number) < 1 || !Number.isInteger(start) || !Number.isInteger(end)) return null;
  if ((start as number) < 0 || (end as number) <= (start as number)) return null;
  if (typeof updated !== "number" || !Number.isFinite(updated)) return null;
  const mark: Mark = {
    id, slug, n: n as number, start: start as number, end: end as number,
    quote: typeof quote === "string" ? quote.slice(0, LIMITS.quote) : "",
    color: HL_COLORS.includes(color as HlColor) ? (color as HlColor) : "yellow",
    note: typeof note === "string" ? note.slice(0, LIMITS.note) : "",
    fic: typeof fic === "string" ? fic.slice(0, LIMITS.label) : "",
    ch: typeof ch === "string" ? ch.slice(0, LIMITS.label) : "",
    updated,
  };
  if (deleted === true) mark.deleted = true;
  return mark;
}

/* Anything that is not a well-formed mark is dropped; the list is capped. */
export function cleanMarks(raw: unknown): Mark[] {
  if (!Array.isArray(raw)) return [];
  const out: Mark[] = [];
  for (const item of raw) {
    const m = clean(item);
    if (m) out.push(m);
    if (out.length >= LIMITS.marks) break;
  }
  return out;
}

/* Merge two lists by id: the more recently changed copy wins, deletions (tombstones) included, so a delete on one device
   reaches the others. Old tombstones are dropped. */
export function mergeMarks(a: Mark[], b: Mark[], now = Date.now()): Mark[] {
  const byId = new Map<string, Mark>();
  for (const m of [...a, ...b]) {
    const have = byId.get(m.id);
    if (!have || m.updated > have.updated) byId.set(m.id, m);
  }
  const cutoff = now - TOMBSTONE_DAYS * 24 * 60 * 60 * 1000;
  return [...byId.values()].filter((m) => !(m.deleted && m.updated < cutoff)).sort((x, y) => x.updated - y.updated).slice(-LIMITS.marks);
}

/* "5JPE-H9QT-AN8F-F3JG": 16 letters and digits (no 0, 1, I, O) in 4 groups: 80 bits, so it cannot be guessed. */
export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{4}(-[A-HJ-NP-Z2-9]{4}){3}$/;

export function normalizeCode(input: string): string {
  const letters = input.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return letters.length === 16 ? letters.match(/.{4}/g)!.join("-") : input.trim().toUpperCase();
}

export function makeCode(random: (n: number) => Uint8Array): string {
  const bytes = random(16);
  let s = "";
  for (let i = 0; i < 16; i++) s += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  return s.match(/.{4}/g)!.join("-");
}

export function newId(random: (n: number) => Uint8Array): string {
  return Array.from(random(8), (b) => (b % 36).toString(36)).join("");
}
