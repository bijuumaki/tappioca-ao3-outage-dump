/* The round photo on Home and About: which picture, and how it sits in the circle. Stored as one line of text in the "photo" row of
   the pages table. Older rows hold just the picture path; both forms are read. */
export type PhotoFrame = { path: string; zoom: number; x: number; y: number };

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 3;
const clamp = (n: number, lo: number, hi: number) => (Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo);

export function normalizeFrame(f: Partial<PhotoFrame> & { path: string }): PhotoFrame {
  return { path: f.path, zoom: clamp(f.zoom ?? 1, ZOOM_MIN, ZOOM_MAX), x: clamp(f.x ?? 50, 0, 100), y: clamp(f.y ?? 50, 0, 100) };
}

export function parsePhoto(body: string | null | undefined): PhotoFrame | null {
  const text = (body ?? "").trim();
  if (!text) return null;
  if (!text.startsWith("{")) return normalizeFrame({ path: text });
  try {
    const raw = JSON.parse(text) as Partial<PhotoFrame>;
    return typeof raw.path === "string" && raw.path ? normalizeFrame({ ...raw, path: raw.path }) : null;
  } catch {
    return null;
  }
}

export function serializePhoto(f: PhotoFrame): string {
  return JSON.stringify(normalizeFrame(f));
}
