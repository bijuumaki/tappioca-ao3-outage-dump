import Link from "next/link";
import type { FicWithChapters } from "@/lib/content/queries";
import { RATING_LABELS, STATUS_LABELS } from "@/lib/content/types";
import { formatWords } from "@/lib/format/words";
import TagList from "./TagList";

export default function FicDetails({ fic }: { fic: FicWithChapters }) {
  return (
    <div className="fic-meta box">
      <dl className="fic-details">
        <div><dt>Category</dt><dd><Link href={`/browse?category=${fic.category.slug}`}>{fic.category.name}</Link></dd></div>
        <div><dt>Rating</dt><dd>{RATING_LABELS[fic.rating]}</dd></div>
        <div><dt>Status</dt><dd>{STATUS_LABELS[fic.status]}</dd></div>
        <div><dt>Length</dt><dd>{formatWords(fic.totalWords)}</dd></div>
        <div><dt>Chapters</dt><dd>{fic.chapters.length}</dd></div>
      </dl>
      <TagList tags={fic.tags} />
    </div>
  );
}
