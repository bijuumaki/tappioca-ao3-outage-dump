import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ChapterBody from "@/components/ChapterBody";
import ChapterGate from "@/components/ChapterGate";
import ChapterNav, { TouchChapterNav } from "@/components/ChapterNav";
import ReaderRegister from "@/components/ReaderRegister";
import RecordPlace from "@/components/RecordPlace";
import { getChapter } from "@/lib/content/queries";
import { RATING_LABELS } from "@/lib/content/types";
import { formatWords } from "@/lib/format/words";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string; n: string }> };

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
  const adult = fic.rating === "mature" || fic.rating === "explicit";
  const warnings = fic.tags.filter((t) => t.type === "warning").map((t) => t.name);

  return (
    <main className="page" id="main">
      {several && <ReaderRegister info={{ slug, n: chapter.n, chapters: options }} />}
      <RecordPlace slug={slug} title={fic.title} n={chapter.n} count={count} />
      <article className="page">
        <header className="reader-header">
          <div><Link href={`/fics/${slug}`} className="story-back">Story details</Link></div>
          <h1 className="page-title"><Link href={`/fics/${slug}`}>{fic.title}</Link></h1>
          <p className="chapter-label">{several ? `Chapter ${chapter.n} of ${count}` : "Chapter 1"} · {formatWords(chapter.word_count)}</p>
          {several && <div className="progress" aria-hidden="true"><div style={{ width: `${Math.round((chapter.n / count) * 100)}%` }} /></div>}
          {several && <TouchChapterNav slug={slug} n={chapter.n} count={count} />}
        </header>
        <ChapterGate slug={slug} adult={adult} ratingLabel={RATING_LABELS[fic.rating]} warnings={warnings}>
          <h2 className="section-bar chapter-title">{chapter.title ?? `Chapter ${chapter.n}`}</h2>
          <ChapterBody id={`${slug}/${chapter.n}`} chapter={chapter} />
          {several && <ChapterNav slug={slug} n={chapter.n} count={count} />}
        </ChapterGate>
      </article>
    </main>
  );
}
