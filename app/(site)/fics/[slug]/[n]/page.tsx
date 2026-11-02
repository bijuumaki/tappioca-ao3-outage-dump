import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ChapterBody from "@/components/ChapterBody";
import ChapterNav from "@/components/ChapterNav";
import ReaderRegister from "@/components/ReaderRegister";
import { getChapter } from "@/lib/content/queries";
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
  if (fic.chapters.length === 1) redirect(`/fics/${slug}`);
  const count = fic.chapters.length;
  const options = fic.chapters.map((c) => ({ n: c.n, label: c.title ? `${c.n}. ${c.title}` : `Chapter ${c.n}` }));

  return (
    <main className="page" id="main">
      <ReaderRegister info={{ slug, n: chapter.n, chapters: options }} />
      <article className="page">
        <header className="reader-header">
          <h1 className="page-title"><Link href={`/fics/${slug}`}>{fic.title}</Link></h1>
          <p className="chapter-label">Chapter {chapter.n} of {count} · {formatWords(chapter.word_count)}</p>
          <div className="progress" aria-hidden="true"><div style={{ width: `${Math.round((chapter.n / count) * 100)}%` }} /></div>
        </header>
        <h2 className="section-bar chapter-title">{chapter.title ?? `Chapter ${chapter.n}`}</h2>
        <ChapterBody id={`${slug}/${chapter.n}`} chapter={chapter} />
        <ChapterNav slug={slug} n={chapter.n} count={count} />
      </article>
    </main>
  );
}
