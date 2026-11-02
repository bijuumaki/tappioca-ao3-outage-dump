import "server-only";
import { createReaderClient } from "@/lib/supabase/server";
import { numberVisibleChapters } from "./chapters";
import type { Category, Chapter, Fic, FicStatus, Page, Post, PostImage, Rating, Tag, TagType } from "./types";

/* Every query here runs with the publishable key, so row-level security already hides drafts and scheduled items. */

export type ChapterSummary = Pick<Chapter, "id" | "position" | "title" | "word_count" | "publish_at"> & { n: number };
export type FicWithChapters = Fic & { category: Category; tags: Tag[]; chapters: ChapterSummary[]; totalWords: number };
export type FicCardData = Pick<Fic, "slug" | "title" | "summary" | "rating" | "status" | "publish_at" | "cover_path" | "featured"> & {
  category: Category; tags: Tag[]; totalWords: number; chapterCount: number; updatedAt: string;
};
export type PostWithImages = Post & { category: Category; tags: Tag[]; images: PostImage[] };
export type PostCardData = Pick<Post, "slug" | "title" | "publish_at"> & { category: Category; tags: Tag[]; firstImage: PostImage | null };
export type FeedItem = { kind: "fic" | "chapter" | "post"; title: string; href: string; publishedAt: string; ficTitle?: string };
export type BrowseFilters = {
  category?: string; rating?: Rating; status?: FicStatus; tags?: { type: TagType; slug: string }[];
  sort?: "newest" | "updated" | "longest" | "shortest";
};

const FIC_SELECT = "*, category:categories(*), fic_tags(tag:tags(*)), chapters(id, position, title, word_count, publish_at)";
const POST_SELECT = "*, category:categories(*), post_tags(tag:tags(*)), post_images(*)";

type FicRow = Fic & {
  category: Category;
  fic_tags: { tag: Tag }[];
  chapters: Pick<Chapter, "id" | "position" | "title" | "word_count" | "publish_at">[];
};
type PostRow = Post & { category: Category; post_tags: { tag: Tag }[]; post_images: PostImage[] };

function shapeFic(row: FicRow): FicWithChapters {
  const { fic_tags, chapters, ...fic } = row;
  const numbered = numberVisibleChapters(chapters);
  return {
    ...fic,
    tags: fic_tags.map((t) => t.tag),
    chapters: numbered,
    totalWords: numbered.reduce((sum, c) => sum + c.word_count, 0),
  };
}

function toFicCard(fic: FicWithChapters): FicCardData {
  const latest = fic.chapters.reduce((max, c) => (c.publish_at && c.publish_at > max ? c.publish_at : max), fic.publish_at ?? "");
  return {
    slug: fic.slug, title: fic.title, summary: fic.summary, rating: fic.rating, status: fic.status, publish_at: fic.publish_at,
    cover_path: fic.cover_path, featured: fic.featured, category: fic.category, tags: fic.tags, totalWords: fic.totalWords, chapterCount: fic.chapters.length, updatedAt: latest,
  };
}

function shapePost(row: PostRow): PostWithImages {
  const { post_tags, post_images, ...post } = row;
  return { ...post, tags: post_tags.map((t) => t.tag), images: [...post_images].sort((a, b) => a.position - b.position) };
}

function toPostCard(post: PostWithImages): PostCardData {
  return { slug: post.slug, title: post.title, publish_at: post.publish_at, category: post.category, tags: post.tags, firstImage: post.images[0] ?? null };
}

async function allFics(): Promise<FicWithChapters[]> {
  const { data, error } = await createReaderClient().from("fics").select(FIC_SELECT);
  if (error) throw error;
  return (data as unknown as FicRow[]).map(shapeFic);
}

async function allPosts(): Promise<PostWithImages[]> {
  const { data, error } = await createReaderClient().from("posts").select(POST_SELECT);
  if (error) throw error;
  return (data as unknown as PostRow[]).map(shapePost);
}

export async function getFic(slug: string): Promise<FicWithChapters | null> {
  const { data, error } = await createReaderClient().from("fics").select(FIC_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? shapeFic(data as unknown as FicRow) : null;
}

export async function getChapter(slug: string, n: number): Promise<{ fic: FicWithChapters; chapter: Chapter & { n: number } } | null> {
  if (!Number.isInteger(n) || n < 1) return null;
  const fic = await getFic(slug);
  const summary = fic?.chapters[n - 1];
  if (!fic || !summary) return null;
  const { data, error } = await createReaderClient().from("chapters").select("*").eq("id", summary.id).maybeSingle();
  if (error) throw error;
  return data ? { fic, chapter: { ...data, n } } : null;
}

export async function getPost(slug: string): Promise<PostWithImages | null> {
  const { data, error } = await createReaderClient().from("posts").select(POST_SELECT).eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? shapePost(data as unknown as PostRow) : null;
}

export async function getHomeFeed(limit = 20): Promise<FeedItem[]> {
  const [fics, posts] = await Promise.all([allFics(), allPosts()]);
  const items: FeedItem[] = [];
  for (const fic of fics) {
    for (const c of fic.chapters) {
      if (!c.publish_at) continue;
      if (c.n === 1) {
        items.push({ kind: "fic", title: fic.title, href: `/fics/${fic.slug}`, publishedAt: c.publish_at });
      } else {
        items.push({ kind: "chapter", title: c.title ?? `Chapter ${c.n}`, href: `/fics/${fic.slug}/${c.n}`, publishedAt: c.publish_at, ficTitle: fic.title });
      }
    }
  }
  for (const post of posts) {
    if (post.publish_at) items.push({ kind: "post", title: post.title, href: `/posts/${post.slug}`, publishedAt: post.publish_at });
  }
  return items.sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, limit);
}

function hasTags(tags: Tag[], wanted: BrowseFilters["tags"]): boolean {
  return (wanted ?? []).every((w) => tags.some((t) => t.type === w.type && t.slug === w.slug));
}

export async function browse(filters: BrowseFilters = {}): Promise<{ fics: FicCardData[]; posts: PostCardData[] }> {
  const [fics, posts] = await Promise.all([allFics(), allPosts()]);
  const ficOnly = !!filters.rating || !!filters.status;

  let ficCards = fics
    .filter((f) => !filters.category || f.category.slug === filters.category)
    .filter((f) => !filters.rating || f.rating === filters.rating)
    .filter((f) => !filters.status || f.status === filters.status)
    .filter((f) => hasTags(f.tags, filters.tags))
    .map(toFicCard);
  let postCards = ficOnly
    ? []
    : posts
        .filter((p) => !filters.category || p.category.slug === filters.category)
        .filter((p) => hasTags(p.tags, filters.tags))
        .map(toPostCard);

  const sort = filters.sort ?? "newest";
  const time = (s: string | null) => (s ? Date.parse(s) : 0);
  if (sort === "longest") ficCards = ficCards.sort((a, b) => b.totalWords - a.totalWords);
  else if (sort === "shortest") ficCards = ficCards.sort((a, b) => a.totalWords - b.totalWords);
  else if (sort === "updated") ficCards = ficCards.sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
  else ficCards = ficCards.sort((a, b) => time(b.publish_at) - time(a.publish_at));
  postCards = postCards.sort((a, b) => time(b.publish_at) - time(a.publish_at));

  return { fics: ficCards, posts: postCards };
}

export async function getTagItems(type: TagType, slug: string): Promise<{ tag: Tag; fics: FicCardData[]; posts: PostCardData[] } | null> {
  const { data: tag, error } = await createReaderClient().from("tags").select("*").eq("type", type).eq("slug", slug).maybeSingle();
  if (error) throw error;
  if (!tag) return null;
  const { fics, posts } = await browse({ tags: [{ type, slug }] });
  return { tag, fics, posts };
}

export const PAGE_SLUGS = ["about", "disclaimer", "links", "comms"] as const;

export async function getPage(slug: string): Promise<Page | null> {
  if (!(PAGE_SLUGS as readonly string[]).includes(slug)) return null;
  const { data, error } = await createReaderClient().from("pages").select("*").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data;
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await createReaderClient().from("categories").select("*").order("id");
  if (error) throw error;
  return data;
}

export type HomeData = {
  featured: FicCardData | null;
  recentFics: FicCardData[];
  recentPosts: PostCardData[];
  storyCount: number;
  fandoms: { name: string; slug: string; count: number }[];
};

/* Fics grouped under each fandom they're tagged with; untagged fics go under "Other". */
export function groupByFandom(fics: FicCardData[]): { name: string; slug: string | null; fics: FicCardData[] }[] {
  const groups = new Map<string, { name: string; slug: string | null; fics: FicCardData[] }>();
  for (const fic of fics) {
    const fandoms = fic.tags.filter((t) => t.type === "fandom");
    const keys = fandoms.length ? fandoms.map((t) => ({ name: t.name, slug: t.slug as string | null })) : [{ name: "Other", slug: null }];
    for (const k of keys) {
      const id = k.slug ?? "";
      if (!groups.has(id)) groups.set(id, { ...k, fics: [] });
      groups.get(id)!.fics.push(fic);
    }
  }
  return [...groups.values()].sort((a, b) => (a.slug === null ? 1 : b.slug === null ? -1 : a.name.localeCompare(b.name)));
}

export async function getHomeData(): Promise<HomeData> {
  const { fics, posts } = await browse({ sort: "updated" });
  const featured = fics.filter((f) => f.featured).sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0] ?? null;
  const fandoms = groupByFandom(fics)
    .filter((g) => g.slug !== null)
    .map((g) => ({ name: g.name, slug: g.slug as string, count: g.fics.length }));
  return { featured, recentFics: fics.slice(0, 6), recentPosts: posts.slice(0, 3), storyCount: fics.length, fandoms };
}

/* Short home-page texts ("howdy", "archive"), stored in the pages table but not public pages. */
export async function getSnippet(slug: "howdy" | "archive"): Promise<string> {
  const { data, error } = await createReaderClient().from("pages").select("body").eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data?.body ?? "";
}
