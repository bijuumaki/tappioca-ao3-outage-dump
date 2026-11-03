"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { hasAck, placeOf, setAck, type Place } from "@/lib/client/reading-memory";

export type StoryOverviewProps = {
  slug: string;
  title: string;
  coverUrl: string | null;
  fandom: { name: string; slug: string } | null;
  summary: ReactNode;
  notes: ReactNode;
  tags: { type: string; name: string; slug: string }[];
  ratingLabel: string;
  adult: boolean;
  warnings: string[];
  details: { k: string; v: string }[];
  chapters: { n: number; label: string }[];
};

/* The notice readers see before a Mature or Explicit story. Also used on chapter pages opened by a direct link. */
export function ContentNotice({ ratingLabel, warnings, onAccept, backHref }: {
  ratingLabel: string; warnings: string[]; onAccept: () => void; backHref: string;
}) {
  return (
    <section aria-labelledby="notice-heading" className="story-notice">
      <h2 id="notice-heading">Content notice</h2>
      <p>This story is rated {ratingLabel}. It may contain adult content.</p>
      {warnings.length > 0 && <p className="muted">Content warnings: {warnings.join(", ")}</p>}
      <div className="story-actions">
        <button type="button" className="story-primary" onClick={onAccept}>Continue to the story</button>
        <Link href={backHref} className="story-secondary">Go back</Link>
      </div>
    </section>
  );
}

const FIRST_SHOWN = 6;

export default function StoryOverview(p: StoryOverviewProps) {
  const router = useRouter();
  const [acked, setAcked] = useState(false);
  const [place, setPlace] = useState<Place | null>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    setAcked(hasAck(p.slug));
    setPlace(placeOf(p.slug));
  }, [p.slug]);

  const hasChapters = p.chapters.length > 0;
  const gated = p.adult && !acked && hasChapters;
  const resumeAt = place && p.chapters.some((c) => c.n === place.n) ? place.n : null;
  const shown = all ? p.chapters : p.chapters.slice(0, FIRST_SHOWN);

  function accept() {
    setAck(p.slug);
    setAcked(true);
    router.push(`/fics/${p.slug}/1`);
  }

  return (
    <article className="story">
      <div><Link href="/fics" className="story-back">Back to the fic list</Link></div>
      <section aria-label="About this story" className="story-head">
        <div className="story-cover">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {p.coverUrl ? <img src={p.coverUrl} alt="" /> : <span>[Cover]</span>}
        </div>
        <header className="story-info">
          <h1 className="page-title">{p.title}</h1>
          {p.fandom && <p className="muted"><Link href={`/tags/fandom/${p.fandom.slug}`}>{p.fandom.name}</Link></p>}
          {p.summary}
          {p.tags.length > 0 && (
            <ul aria-label="Tags" className="story-tags">
              {p.tags.map((t) => <li key={`${t.type}/${t.slug}`}><Link href={`/tags/${t.type}/${t.slug}`}>{t.name}</Link></li>)}
            </ul>
          )}
        </header>
      </section>

      {p.notes && <aside className="notes" aria-label="Fic notes">{p.notes}</aside>}

      <section aria-labelledby="details-heading" className="story-section">
        <h2 id="details-heading" className="section-bar">Details</h2>
        <dl className="story-details">
          {p.details.map((d) => <div key={d.k}><dt>{d.k}</dt><dd>{d.v}</dd></div>)}
        </dl>
      </section>

      {gated && (
        <ContentNotice ratingLabel={p.ratingLabel} warnings={p.warnings} onAccept={accept} backHref="/fics" />
      )}

      {!gated && hasChapters && (
        <div className="story-start">
          <Link href={`/fics/${p.slug}/${resumeAt ?? 1}`} className="story-primary story-big">
            {resumeAt ? `Resume at chapter ${resumeAt}` : "Start reading"}
          </Link>
          {p.adult && acked && <p className="muted story-seen">You have seen the content notice for this story ({p.ratingLabel}).</p>}
        </div>
      )}

      <section aria-labelledby="chapters-heading" className="story-section">
        <h2 id="chapters-heading" className="section-bar">Chapters</h2>
        {!hasChapters && <p className="empty-note">No chapters yet.</p>}
        {gated && <p className="muted story-seen">Read the content notice above to open a chapter.</p>}
        {hasChapters && (
          <ul className="story-chapters">
            {shown.map((c) => (
              <li key={c.n}>
                {gated
                  ? <button type="button" disabled>{c.label}</button>
                  : <Link href={`/fics/${p.slug}/${c.n}`}><span>{c.label}</span><span className="muted">{resumeAt === c.n ? "Resume here" : ""}</span></Link>}
              </li>
            ))}
          </ul>
        )}
        {p.chapters.length > FIRST_SHOWN && (
          <button type="button" className="story-secondary story-toggle" aria-expanded={all} onClick={() => setAll(!all)}>
            {all ? "Show fewer chapters" : `Show all ${p.chapters.length} chapters`}
          </button>
        )}
      </section>
    </article>
  );
}
