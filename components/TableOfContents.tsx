import Link from "next/link";
import type { ChapterSummary } from "@/lib/content/queries";
import { formatWords } from "@/lib/format/words";

export default function TableOfContents({ slug, chapters }: { slug: string; chapters: ChapterSummary[] }) {
  return (
    <nav aria-label="Contents" className="toc page">
      <h2 className="section-bar">Contents</h2>
      <ol>
        {chapters.map((c) => (
          <li key={c.id}>
            <Link href={`/fics/${slug}/${c.n}`}>
              <span>{c.title ? `${c.n}. ${c.title}` : `Chapter ${c.n}`}</span>
              <span className="toc-words">{formatWords(c.word_count)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
