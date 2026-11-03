import Link from "next/link";
import ContentsLink from "./ContentsLink";

export default function ChapterNav({ slug, n, count }: { slug: string; n: number; count: number }) {
  return (
    <nav aria-label="Chapters" className="chapter-buttons">
      {n > 1 ? <Link href={`/fics/${slug}/${n - 1}`} aria-label="Previous chapter"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4l-6 6 6 6" /></svg></Link> : <span aria-hidden="true"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 4l-6 6 6 6" /></svg></span>}
      <ContentsLink slug={slug} />
      {n < count ? <Link href={`/fics/${slug}/${n + 1}`} aria-label="Next chapter"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 4l6 6-6 6" /></svg></Link> : <span aria-hidden="true"><svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M8 4l6 6-6 6" /></svg></span>}
    </nav>
  );
}
