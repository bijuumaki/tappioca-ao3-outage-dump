import Link from "next/link";
import type { ChapterSummary } from "@/lib/content/queries";
import { formatWords } from "@/lib/format/words";

export default function TableOfContents({ slug, chapters }: { slug: string; chapters: ChapterSummary[] }) {
  return (
    <nav aria-label="Contents" className="toc">
      <h2 className="toc-title">Contents</h2>
      <ol>
        {chapters.map((c) => (
          <li key={c.id}>
            <Link href={`/fics/${slug}/${c.n}`}>{c.title ? `${c.n}. ${c.title}` : `Chapter ${c.n}`}</Link>
            <span className="toc-words">{formatWords(c.word_count)}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
