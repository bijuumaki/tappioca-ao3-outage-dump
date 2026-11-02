import type { Chapter } from "@/lib/content/types";
import RichText from "./RichText";
import ReadingProgress from "./ReadingProgress";

/* Notes, text and end notes of one chapter, with reading progress. */
export default function ChapterBody({ id, chapter }: { id: string; chapter: Chapter }) {
  return (
    <ReadingProgress id={id}>
      <div className="page">
        {chapter.notes_before && <aside className="notes" aria-label="Notes"><RichText html={chapter.notes_before} /></aside>}
        <RichText html={chapter.body} className="chapter-text" />
        {chapter.notes_after && <aside className="notes" aria-label="End notes"><RichText html={chapter.notes_after} /></aside>}
      </div>
    </ReadingProgress>
  );
}
