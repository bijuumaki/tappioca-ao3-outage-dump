import Link from "next/link";
import type { FicCardData } from "@/lib/content/queries";
import { RATING_LABELS, STATUS_LABELS } from "@/lib/content/types";
import { formatWords } from "@/lib/format/words";
import TagList from "./TagList";

export default function FicCard({ fic }: { fic: FicCardData }) {
  return (
    <article className="card fic-card box">
      <h3 className="card-title"><Link href={`/fics/${fic.slug}`}>{fic.title}</Link></h3>
      <p className="card-meta">
        {fic.category.name} · {RATING_LABELS[fic.rating]} · {STATUS_LABELS[fic.status]} ·{" "}
        <span className="card-words" data-words={fic.totalWords}>{formatWords(fic.totalWords)}</span> ·{" "}
        {fic.chapterCount === 1 ? "1 chapter" : `${fic.chapterCount} chapters`}
      </p>
      {fic.summary && <p className="card-summary">{fic.summary}</p>}
      <TagList tags={fic.tags} />
    </article>
  );
}
