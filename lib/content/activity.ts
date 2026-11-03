/* "Latest activity" on Home (canvas v146 and Bijuu's reply): the three newest things on the site, newest first.
   A new story (a story's first chapter), a new chapter, or a new comment from a reader. */
export type ActivityItem = { kind: "story" | "chapter" | "comment"; slug: string; title: string; n: number; at: string };

type FicLike = { slug: string; title: string; chapters: { id: number; n: number; publish_at: string | null }[] };
type CommentLike = { chapter_id: number; created_at: string };

export function latestActivity(fics: FicLike[], comments: CommentLike[] = [], limit = 3): ActivityItem[] {
  const items: ActivityItem[] = [];
  const byChapter = new Map<number, { fic: FicLike; n: number }>();
  for (const fic of fics) {
    for (const c of fic.chapters) {
      byChapter.set(c.id, { fic, n: c.n });
      if (c.publish_at) items.push({ kind: c.n === 1 ? "story" : "chapter", slug: fic.slug, title: fic.title, n: c.n, at: c.publish_at });
    }
  }
  for (const c of comments) {
    const where = byChapter.get(c.chapter_id);
    if (where) items.push({ kind: "comment", slug: where.fic.slug, title: where.fic.title, n: where.n, at: c.created_at });
  }
  return items
    .sort((a, b) => b.at.localeCompare(a.at) || a.title.localeCompare(b.title) || b.n - a.n)
    .slice(0, limit);
}
