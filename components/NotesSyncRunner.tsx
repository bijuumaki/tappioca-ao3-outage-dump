"use client";
import { useEffect } from "react";
import { NOTES_EVENT } from "@/lib/client/notes-store";
import { getCode, syncNow } from "@/lib/client/notes-sync";
import { pushShared } from "@/lib/client/notes-share";

/* With sync on: merge once when a page opens, and a few seconds after each change. Quiet changes (from sync itself) don't loop.
   Also sends new highlights and notes to the author, anonymously, unless the reader turned that off. */
export default function NotesSyncRunner() {
  useEffect(() => {
    if (getCode()) void syncNow();
    void pushShared();
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onChange = (e: Event) => {
      if ((e as CustomEvent).detail?.quiet) return;
      clearTimeout(timer);
      timer = setTimeout(() => { if (getCode()) void syncNow(); void pushShared(); }, 3000);
    };
    window.addEventListener(NOTES_EVENT, onChange);
    return () => { window.removeEventListener(NOTES_EVENT, onChange); clearTimeout(timer); };
  }, []);
  return null;
}
