/* "Latest activity" on Home (canvas v146): the newest published chapters, newest first. A story's first chapter reads as a new story. */
export type ActivityItem = { kind: "story" | "chapter"; slug: string; title: string; n: number; at: string };

type FicLike = { slug: string; title: string; chapters: { n: number; publish_at: string | null }[] };

export function latestActivity(fics: FicLike[], limit = 3): ActivityItem[] {
  const items: ActivityItem[] = [];
  for (const fic of fics) {
    for (const c of fic.chapters) {
      if (c.publish_at) items.push({ kind: c.n === 1 ? "story" : "chapter", slug: fic.slug, title: fic.title, n: c.n, at: c.publish_at });
    }
  }
  return items
    .sort((a, b) => b.at.localeCompare(a.at) || a.title.localeCompare(b.title) || b.n - a.n)
    .slice(0, limit);
}
