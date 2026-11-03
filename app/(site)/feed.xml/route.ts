import { allFics } from "@/lib/content/queries";
import { buildFeed } from "@/lib/feed/rss";

export const revalidate = 300;

export async function GET(req: Request) {
  const site = new URL(req.url).origin;
  const fics = await allFics();
  const xml = buildFeed(site, {
    title: "Tappioca’s Fic Archive", path: "/feed.xml", link: "/", withStory: true,
    fics: fics.map((f) => ({ slug: f.slug, title: f.title, chapters: f.chapters.map((c) => ({ n: c.n, title: c.title, publishAt: c.publish_at })) })),
  });
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
