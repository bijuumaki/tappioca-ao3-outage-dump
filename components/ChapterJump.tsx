"use client";
import { useRouter } from "next/navigation";

/* The chapter dropdown under the chapter label. It has no visible label (the canvas hides it); it is named for screen readers. */
export default function ChapterJump({ slug, n, chapters }: { slug: string; n: number; chapters: { n: number; label: string }[] }) {
  const router = useRouter();
  return (
    <select id="chapter-select" className="chapter-jump" aria-label="Jump to chapter" value={n}
      onChange={(e) => { router.push(`/fics/${slug}/${e.target.value}`); window.scrollTo(0, 0); }}>
      {chapters.map((c) => <option key={c.n} value={c.n}>{c.label}</option>)}
    </select>
  );
}
