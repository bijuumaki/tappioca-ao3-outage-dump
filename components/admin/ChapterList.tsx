import Link from "next/link";
import { addChapter } from "@/lib/admin/actions";
import { statusOf } from "@/lib/admin/queries";
import type { Chapter } from "@/lib/content/types";

export default function ChapterList({ ficId, chapters, currentId }: { ficId: number; chapters: Chapter[]; currentId: number | null }) {
  return (
    <section className="a-section" aria-label="Chapters">
      <h2 className="a-bar">Chapters</h2>
      <ol className="a-chapters">
        {chapters.map((c, i) => (
          <li key={c.id}>
            <Link href={`/admin/stories/${ficId}?chapter=${c.id}`} aria-current={c.id === currentId ? "page" : undefined}>
              <span className="keep-case">{c.title ? `${i + 1}. ${c.title}` : `Chapter ${i + 1}`}</span>
              <span className="a-muted">{statusOf(c.publish_at)}</span>
            </Link>
          </li>
        ))}
      </ol>
      <form action={addChapter.bind(null, ficId)}>
        <button type="submit" className="a-add">+ Add chapter</button>
      </form>
    </section>
  );
}
