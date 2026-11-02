import Link from "next/link";

export default function ChapterNav({ slug, n, count }: { slug: string; n: number; count: number }) {
  return (
    <nav aria-label="Chapters" className="chapter-nav">
      {n > 1 ? <Link href={`/fics/${slug}/${n - 1}`}>← Previous</Link> : <span />}
      <Link href={`/fics/${slug}`}>Contents</Link>
      {n < count ? <Link href={`/fics/${slug}/${n + 1}`}>Next →</Link> : <span />}
    </nav>
  );
}
