"use client";
import Link from "next/link";

/* Scrolls to the top and focuses the chapter dropdown, as on the canvas. Without JavaScript it goes to the story page. */
export default function ContentsLink({ slug }: { slug: string }) {
  return (
    <Link href={`/fics/${slug}`} className="contents-link" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0 }); document.getElementById("chapter-select")?.focus(); }}>
      Contents
    </Link>
  );
}
