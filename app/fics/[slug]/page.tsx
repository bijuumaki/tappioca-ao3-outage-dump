import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChapterBody from "@/components/ChapterBody";
import FicDetails from "@/components/FicDetails";
import RichText from "@/components/RichText";
import TableOfContents from "@/components/TableOfContents";
import { getChapter, getFic } from "@/lib/content/queries";
import { formatWords } from "@/lib/format/words";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fic = await getFic((await params).slug);
  return { title: fic?.title ?? "Not found" };
}

export default async function FicPage({ params }: Props) {
  const { slug } = await params;
  const fic = await getFic(slug);
  if (!fic) notFound();
  const oneshot = fic.chapters.length === 1 ? await getChapter(slug, 1) : null;

  return (
    <main className="page" id="main">
      <header className="reader-header">
        <h1 className="page-title">{fic.title}</h1>
        {oneshot && <p className="chapter-label">{formatWords(oneshot.chapter.word_count)}</p>}
      </header>
      <FicDetails fic={fic} />
      {fic.summary && <section aria-label="Summary" className="box"><RichText html={fic.summary} /></section>}
      {fic.notes && <aside className="notes" aria-label="Fic notes"><RichText html={fic.notes} /></aside>}
      {fic.chapters.length === 0 && <p className="empty-note">No chapters yet.</p>}
      {oneshot && <ChapterBody id={`${slug}/1`} chapter={oneshot.chapter} />}
      {fic.chapters.length > 1 && <TableOfContents slug={slug} chapters={fic.chapters} />}
    </main>
  );
}
