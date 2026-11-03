import Link from "next/link";
import type { FicCardData } from "@/lib/content/queries";
import { mediaUrl } from "@/lib/content/media";
import HeartIcon from "./HeartIcon";
import { heartsLabel } from "@/lib/format/hearts";
import { fandomNames, lengthLine, ratingAndRelationships } from "@/lib/format/fic-meta";

export default function FicCard({ fic, showFandom = true }: { fic: FicCardData; showFandom?: boolean }) {
  return (
    <Link href={`/fics/${fic.slug}`} className="card fic-card">
      <span className="card-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {fic.cover_path && <img src={mediaUrl(fic.cover_path)} alt="" loading="lazy" />}
      </span>
      <span className="card-body">
        <span className="card-title">{fic.title}</span>
        {showFandom && fandomNames(fic) && <span className="card-meta">{fandomNames(fic)}</span>}
        <span className="card-meta">{ratingAndRelationships(fic)}</span>
        <span className="card-meta card-words" data-words={fic.totalWords}>{lengthLine(fic)}</span>
        <span className="card-meta card-hearts"><HeartIcon filled={false} />{heartsLabel(fic.hearts)}</span>
      </span>
    </Link>
  );
}
