import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RichText from "@/components/RichText";
import StoryOverview from "@/components/StoryOverview";
import { mediaUrl } from "@/lib/content/media";
import { getFic } from "@/lib/content/queries";
import { RATING_LABELS, STATUS_LABELS } from "@/lib/content/types";
import { formatDate } from "@/lib/format/dates";
import { formatWords } from "@/lib/format/words";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const fic = await getFic((await params).slug);
  return { title: fic?.title ?? "Not found" };
}

export default async function FicPage({ params }: Props) {
  const { slug } = await params;
  const fic = await getFic(slug);
  if (!fic) notFound();

  const names = (type: string) => fic.tags.filter((t) => t.type === type).map((t) => t.name);
  const fandomTag = fic.tags.find((t) => t.type === "fandom") ?? null;
  const updated = fic.chapters.map((c) => c.publish_at).filter((d): d is string => !!d).sort().at(-1) ?? null;
  const details = [
    { k: "Rating", v: RATING_LABELS[fic.rating] },
    ...(names("relationship").length ? [{ k: "Relationships", v: names("relationship").join(", ") }] : []),
    { k: "Words", v: formatWords(fic.totalWords) },
    { k: "Chapters", v: String(fic.chapters.length) },
    { k: "Status", v: STATUS_LABELS[fic.status] },
    ...(updated ? [{ k: "Updated", v: formatDate(updated) }] : []),
  ];

  return (
    <main className="page" id="main">
      <StoryOverview
        slug={slug}
        title={fic.title}
        coverUrl={fic.cover_path ? mediaUrl(fic.cover_path) : null}
        fandom={fandomTag ? { name: fandomTag.name, slug: fandomTag.slug } : null}
        summary={fic.summary ? <RichText html={fic.summary} /> : null}
        notes={fic.notes ? <RichText html={fic.notes} /> : null}
        tags={fic.tags.filter((t) => t.type !== "fandom").map((t) => ({ type: t.type, name: t.name, slug: t.slug }))}
        ratingLabel={RATING_LABELS[fic.rating]}
        adult={fic.rating === "mature" || fic.rating === "explicit"}
        warnings={names("warning")}
        details={details}
        chapters={fic.chapters.map((c) => ({ n: c.n, label: c.title ? `${c.n}. ${c.title}` : `Chapter ${c.n}` }))}
      />
    </main>
  );
}
