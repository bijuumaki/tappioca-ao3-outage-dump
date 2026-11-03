import type { Chapter } from "@/lib/content/types";
import RichText from "./RichText";
import ReadingProgress from "./ReadingProgress";
import ChapterHighlights from "./ChapterHighlights";

/* Notes, text and end notes of one chapter, with reading progress. */
/* `highlight` is given on public chapter pages only; previews have no highlighting. */
export default function ChapterBody({ id, chapter, highlight }: { id: string; chapter: Pick<Chapter, "notes_before" | "body" | "notes_after">; highlight?: { slug: string; n: number; fic: string; ch: string } }) {
  return (
    <ReadingProgress id={id}>
      <div className="page">
        {chapter.notes_before && <aside className="notes" aria-label="Notes"><RichText html={chapter.notes_before} /></aside>}
        <RichText html={chapter.body} className="chapter-text" />
        {chapter.notes_after && <aside className="notes" aria-label="End notes"><RichText html={chapter.notes_after} /></aside>}
      </div>
      {highlight && <ChapterHighlights {...highlight} />}
    </ReadingProgress>
  );
}
