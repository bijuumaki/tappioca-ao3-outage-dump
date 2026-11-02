"use client";
import { useSyncExternalStore } from "react";

/* The chapter page tells the Aa panel which chapters exist, so the panel can offer a chapter picker. */
export type ReaderInfo = { slug: string; n: number; chapters: { n: number; label: string }[] } | null;

let current: ReaderInfo = null;
const listeners = new Set<() => void>();

export function setReaderInfo(info: ReaderInfo): void {
  current = info;
  listeners.forEach((l) => l());
}

export function useReaderInfo(): ReaderInfo {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => current,
    () => null,
  );
}
