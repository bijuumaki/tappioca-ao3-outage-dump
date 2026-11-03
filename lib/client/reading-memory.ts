import { readPref, writePref } from "./prefs";

/* Where each story was left, and which content notices were accepted. Browser-only, no accounts. */
const PLACE_KEY = "fic-site-place";
const ACK_KEY = "fic-site-ack";

export type Place = { n: number; title: string; count: number; at: number };

function load(key: string): Record<string, unknown> {
  try {
    const value = JSON.parse(readPref(key) ?? "{}");
    return value && typeof value === "object" && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function isPlace(v: unknown): v is Place {
  const p = v as Place | null;
  return !!p && typeof p.n === "number" && typeof p.title === "string" && typeof p.count === "number" && typeof p.at === "number";
}

export function recordPlace(slug: string, p: { n: number; title: string; count: number }): void {
  const all = load(PLACE_KEY);
  all[slug] = { n: p.n, title: p.title, count: p.count, at: Date.now() } satisfies Place;
  writePref(PLACE_KEY, JSON.stringify(all));
}

export function placeOf(slug: string): Place | null {
  const v = load(PLACE_KEY)[slug];
  return isPlace(v) ? v : null;
}

export function lastPlace(): ({ slug: string } & Place) | null {
  let best: ({ slug: string } & Place) | null = null;
  for (const [slug, v] of Object.entries(load(PLACE_KEY))) {
    if (isPlace(v) && (!best || v.at > best.at)) best = { slug, ...v };
  }
  return best;
}

export function hasAck(slug: string): boolean {
  return load(ACK_KEY)[slug] === true;
}

export function setAck(slug: string): void {
  const all = load(ACK_KEY);
  all[slug] = true;
  writePref(ACK_KEY, JSON.stringify(all));
}

const HEART_KEY = "fic-site-hearted";

export function isHearted(slug: string): boolean {
  return load(HEART_KEY)[slug] === true;
}

export function setHearted(slug: string, on: boolean): void {
  const all = load(HEART_KEY);
  if (on) all[slug] = true; else delete all[slug];
  writePref(HEART_KEY, JSON.stringify(all));
}
