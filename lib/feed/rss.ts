/* RSS 2.0 feeds. Every item is one visible chapter. Nothing here invents text: items say which chapter of which story it is. */
export type FeedChapter = { n: number; title: string | null; publishAt: string | null };
export type FeedFic = { slug: string; title: string; chapters: FeedChapter[] };

export function xmlEscape(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function itemsOf(site: string, fics: FeedFic[], withStory: boolean) {
  const items = fics.flatMap((f) => f.chapters.filter((c) => c.publishAt).map((c) => ({ f, c, at: new Date(c.publishAt as string) })));
  items.sort((a, b) => b.at.getTime() - a.at.getTime());
  return items.map(({ f, c, at }) => {
    const url = `${site}/fics/${f.slug}/${c.n}`;
    const name = c.title ? `${c.n}. ${c.title}` : `Chapter ${c.n}`;
    const title = withStory ? `${f.title}: ${name}` : name;
    return `<item><title>${xmlEscape(title)}</title><link>${xmlEscape(url)}</link><guid isPermaLink="true">${xmlEscape(url)}</guid><pubDate>${at.toUTCString()}</pubDate><description>${xmlEscape(`Chapter ${c.n} of ${f.title}`)}</description></item>`;
  });
}

export function buildFeed(site: string, opts: { title: string; path: string; link: string; fics: FeedFic[]; withStory: boolean }): string {
  const items = itemsOf(site, opts.fics, opts.withStory);
  return `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel>`
    + `<title>${xmlEscape(opts.title)}</title><link>${xmlEscape(site + opts.link)}</link>`
    + `<description>${xmlEscape(`New chapters from ${opts.title}`)}</description>`
    + `<atom:link href="${xmlEscape(site + opts.path)}" rel="self" type="application/rss+xml"/>`
    + items.slice(0, 50).join("") + `</channel></rss>`;
}
