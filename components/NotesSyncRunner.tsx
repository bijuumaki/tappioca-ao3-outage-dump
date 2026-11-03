"use client";
import { useEffect } from "react";
import { NOTES_EVENT } from "@/lib/client/notes-store";
import { getCode, syncNow } from "@/lib/client/notes-sync";

/* With sync on: merge once when a page opens, and a few seconds after each change. Quiet changes (from sync itself) don't loop. */
export default function NotesSyncRunner() {
  useEffect(() => {
    if (getCode()) void syncNow();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = (e: Event) => {
      if ((e as CustomEvent).detail?.quiet || !getCode()) return;
      clearTimeout(timer);
      timer = setTimeout(() => void syncNow(), 3000);
    };
    window.addEventListener(NOTES_EVENT, onChange);
    return () => { window.removeEventListener(NOTES_EVENT, onChange); clearTimeout(timer); };
  }, []);
  return null;
}
