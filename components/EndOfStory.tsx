import Link from "next/link";

/* Shown under the last chapter. */
export default function EndOfStory({ slug, title, count, fandom }: {
  slug: string; title: string; count: number; fandom: { name: string; slug: string } | null;
}) {
  const heading = `You have reached the end of ${title}`;
  return (
    <section aria-labelledby="end-heading" className="story-end">
      <h2 id="end-heading">{heading}</h2>
      <p>{count > 1 ? `That was chapter ${count}, the last one.` : "That was the whole story."}</p>
      <div className="story-actions">
        <Link href={`/fics/${slug}/1`} className="story-secondary">Read again</Link>
        {fandom
          ? <Link href={`/tags/fandom/${fandom.slug}`} className="story-secondary">More in {fandom.name}</Link>
          : <Link href="/fics" className="story-secondary">More stories</Link>}
        <Link href={`/fics/${slug}`} className="story-secondary">Story details</Link>
      </div>
    </section>
  );
}
