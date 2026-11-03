"use client";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import FollowButton from "./FollowButton";
import HeartButton from "./HeartButton";
import { placeOf, type Place } from "@/lib/client/reading-memory";

export type StoryOverviewProps = {
  slug: string;
  title: string;
  fandom: { name: string; slug: string } | null;
  summary: ReactNode;
  notes: ReactNode;
  tags: { type: string; name: string; slug: string }[];
  details: { k: string; v: string }[];
  chapters: { n: number; label: string }[];
};

const FIRST_SHOWN = 6;

export default function StoryOverview(p: StoryOverviewProps) {
  const [place, setPlace] = useState<Place | null>(null);
  const [all, setAll] = useState(false);

  useEffect(() => {
    setPlace(placeOf(p.slug));
  }, [p.slug]);

  const hasChapters = p.chapters.length > 0;
  const resumeAt = place && p.chapters.some((c) => c.n === place.n) ? place.n : null;
  const shown = all ? p.chapters : p.chapters.slice(0, FIRST_SHOWN);

  return (
    <article className="story">
      <div><Link href="/fics" className="story-back">Back to the fic list</Link></div>
      <section aria-label="About this story" className="story-head">
        <header className="story-info">
          <h1 className="page-title">{p.title}</h1>
          {p.fandom && <p className="muted"><Link href={`/tags/fandom/${p.fandom.slug}`}>{p.fandom.name}</Link></p>}
          {p.summary}
          {p.tags.length > 0 && (
            <ul aria-label="Tags" className="story-tags">
              {p.tags.map((t) => <li key={`${t.type}/${t.slug}`}><Link href={`/tags/${t.type}/${t.slug}`}>{t.name}</Link></li>)}
            </ul>
          )}
          <div className="heart-follow">
            <HeartButton slug={p.slug} />
            <FollowButton path={`/feed/${p.slug}.xml`} label="Follow new chapters (rss)" />
          </div>
        </header>
      </section>

      {p.notes && <aside className="notes" aria-label="Fic notes">{p.notes}</aside>}

      <section aria-labelledby="details-heading" className="story-section">
        <h2 id="details-heading" className="section-bar">Details</h2>
        <dl className="story-details">
          {p.details.map((d) => <div key={d.k}><dt>{d.k}</dt><dd>{d.v}</dd></div>)}
        </dl>
      </section>

      {hasChapters && (
        <div className="story-start">
          <Link href={`/fics/${p.slug}/${resumeAt ?? 1}`} className="story-primary story-big">
            {resumeAt ? `Resume at chapter ${resumeAt}` : "Start reading"}
          </Link>
        </div>
      )}

      <section aria-labelledby="chapters-heading" className="story-section">
        <h2 id="chapters-heading" className="section-bar">Chapters</h2>
        {!hasChapters && <p className="empty-note">No chapters yet.</p>}
        {hasChapters && (
          <ul className="story-chapters">
            {shown.map((c) => (
              <li key={c.n}>
                <Link href={`/fics/${p.slug}/${c.n}`}><span>{c.label}</span><span className="muted">{resumeAt === c.n ? "Resume here" : ""}</span></Link>
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
