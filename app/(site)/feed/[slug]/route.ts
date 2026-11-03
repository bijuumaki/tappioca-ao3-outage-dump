import { getFic } from "@/lib/content/queries";
import { buildFeed } from "@/lib/feed/rss";

export const revalidate = 300;

/* /feed/<story>.xml: one story's chapters. */
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const slug = (await params).slug.replace(/\.xml$/, "");
  const fic = await getFic(slug);
  if (!fic) return new Response("Not found", { status: 404 });
  const site = new URL(req.url).origin;
  const xml = buildFeed(site, {
    title: fic.title, path: `/feed/${slug}.xml`, link: `/fics/${slug}`, withStory: false,
    fics: [{ slug, title: fic.title, chapters: fic.chapters.map((c) => ({ n: c.n, title: c.title, publishAt: c.publish_at })) }],
  });
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
