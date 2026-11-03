"use client";
import Link from "next/link";

/* Opens the Aa panel (which has the chapter picker). Without JavaScript it goes to the fic's contents page. */
export default function ContentsLink({ slug }: { slug: string }) {
  return (
    <Link href={`/fics/${slug}`} className="contents-link" onClick={(e) => { e.preventDefault(); window.dispatchEvent(new Event("tappioca:toggle-options")); }}>
      Contents
    </Link>
  );
}
