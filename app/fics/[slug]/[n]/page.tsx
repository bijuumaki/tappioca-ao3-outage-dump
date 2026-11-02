import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import ChapterBody from "@/components/ChapterBody";
import ChapterNav from "@/components/ChapterNav";
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

  return (
    <main className="page" id="main">
      <p className="chapter-fic"><Link href={`/fics/${slug}`}>{fic.title}</Link></p>
      <h1 className="heading">{chapter.title ? `${chapter.n}. ${chapter.title}` : `Chapter ${chapter.n}`}</h1>
      <p className="chapter-words">{formatWords(chapter.word_count)}</p>
      <ChapterNav slug={slug} n={chapter.n} count={count} />
      <ChapterBody id={`${slug}/${chapter.n}`} chapter={chapter} />
      <ChapterNav slug={slug} n={chapter.n} count={count} />
    </main>
  );
}
