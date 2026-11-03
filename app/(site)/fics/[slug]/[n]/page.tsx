import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BackToTop from "@/components/BackToTop";
import ChapterBody from "@/components/ChapterBody";
import ChapterJump from "@/components/ChapterJump";
import ChapterNav from "@/components/ChapterNav";
import Comments from "@/components/Comments";
import EndOfStory from "@/components/EndOfStory";
import ReaderRegister from "@/components/ReaderRegister";
import RecordPlace from "@/components/RecordPlace";
import { getChapter } from "@/lib/content/queries";
import { formatWords } from "@/lib/format/words";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; n: string }> };

/* "Chapter N: title", but a title that only repeats the number ("1", "Chapter 1") would read "Chapter 1: 1". */
function chapterHeading(n: number, title: string | null): string {
  const t = title?.trim();
  return !t || /^(chapter\s*)?\d+$/i.test(t) ? `Chapter ${n}` : `Chapter ${n}: ${t}`;
}

function parseN(n: string): number {
  return /^[1-9]\d{0,3}$/.test(n) ? Number(n) : 0;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug, n } = await params;
  const found = await getChapter(slug, parseN(n));
  if (!found) return { title: "Not found" };
  return { title: `${found.chapter.title ?? `Chapter ${found.chapter.n}`} · ${found.fic.title}` };
}

export default async function ChapterPage({ params }: Props) {
  const { slug, n } = await params;
  const found = await getChapter(slug, parseN(n));
  if (!found) notFound();
  const { fic, chapter } = found;
  const count = fic.chapters.length;
  const several = count > 1;
  const options = fic.chapters.map((c) => ({ n: c.n, label: c.title ? `${c.n}. ${c.title}` : `Chapter ${c.n}` }));

  return (
    <main className="page" id="main">
      <ReaderRegister info={{ slug, n: chapter.n, chapters: options }} />
      <RecordPlace slug={slug} title={fic.title} n={chapter.n} count={count} />
      <article className="page">
        <header className="reader-header">
          <div><Link href={`/fics/${slug}`} className="story-back">Story details</Link></div>
          <h1 className="page-title"><Link href={`/fics/${slug}`}>{fic.title}</Link></h1>
          <p className="chapter-label">{several ? `Chapter ${chapter.n} of ${count}` : "Chapter 1"} · {formatWords(chapter.word_count)}</p>
          {several && <ChapterJump slug={slug} n={chapter.n} chapters={options} />}
          {several && <div className="progress" aria-hidden="true"><div style={{ width: `${Math.round((chapter.n / count) * 100)}%` }} /></div>}
        </header>
        <>
          <h2 className="section-bar chapter-title">{chapterHeading(chapter.n, chapter.title)}</h2>
          <ChapterBody id={`${slug}/${chapter.n}`} chapter={chapter} />
          {several && <ChapterNav slug={slug} n={chapter.n} count={count} />}
          {chapter.n === count && <EndOfStory slug={slug} />}
          <Comments slug={slug} n={chapter.n} />
        </>
      </article>
      <BackToTop />
    </main>
  );
}
