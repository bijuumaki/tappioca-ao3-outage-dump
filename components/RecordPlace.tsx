"use client";
import { useEffect } from "react";
import { recordPlace } from "@/lib/client/reading-memory";

/* Remembers the chapter being read, so Home and the story page can offer to resume. Renders nothing. */
export default function RecordPlace({ slug, title, n, count }: { slug: string; title: string; n: number; count: number }) {
  useEffect(() => { recordPlace(slug, { n, title, count }); }, [slug, title, n, count]);
  return null;
}
