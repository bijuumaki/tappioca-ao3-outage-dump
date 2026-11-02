import Link from "next/link";
import ContentsLink from "./ContentsLink";

export default function ChapterNav({ slug, n, count }: { slug: string; n: number; count: number }) {
  return (
    <nav aria-label="Chapters" className="chapter-buttons">
      {n > 1 ? <Link href={`/fics/${slug}/${n - 1}`}>Previous</Link> : <span aria-hidden="true">Previous</span>}
      <ContentsLink slug={slug} />
      {n < count ? <Link href={`/fics/${slug}/${n + 1}`}>Next</Link> : <span aria-hidden="true">Next</span>}
    </nav>
  );
}
