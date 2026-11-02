import type { Metadata } from "next";
import Link from "next/link";
import FicCard from "@/components/FicCard";
import PostCard from "@/components/PostCard";
import { browse, getCategories, type BrowseFilters } from "@/lib/content/queries";
import { RATING_LABELS, STATUS_LABELS, TAG_TYPE_LABELS, TAG_TYPES, type FicStatus, type Rating, type TagType } from "@/lib/content/types";

export const metadata: Metadata = { title: "Browse" };
export const revalidate = 60;

type Search = Record<string, string | string[] | undefined>;
const SORTS = { newest: "Newest", updated: "Last updated", longest: "Longest", shortest: "Shortest" } as const;

function one(v: string | string[] | undefined): string | undefined {
  return Array.isArray(v) ? v[0] : v;
}

function parseFilters(sp: Search): BrowseFilters {
  const rating = one(sp.rating);
  const status = one(sp.status);
  const sort = one(sp.sort);
  const tagParams = ([] as string[]).concat(sp.tag ?? []);
  return {
    category: one(sp.category) || undefined,
    rating: rating && rating in RATING_LABELS ? (rating as Rating) : undefined,
    status: status && status in STATUS_LABELS ? (status as FicStatus) : undefined,
    sort: sort && sort in SORTS ? (sort as BrowseFilters["sort"]) : undefined,
    tags: tagParams
      .map((t) => t.split(":"))
      .filter(([type, slug]) => (TAG_TYPES as string[]).includes(type) && !!slug)
      .map(([type, slug]) => ({ type: type as TagType, slug })),
  };
}

export default async function BrowsePage({ searchParams }: { searchParams: Promise<Search> }) {
  const filters = parseFilters(await searchParams);
  const [categories, { fics, posts }] = await Promise.all([getCategories(), browse(filters)]);

  return (
    <main className="page" id="main">
      <h1 className="page-title">Browse</h1>
      <form method="get" className="browse-form box">
        <label>Category
          <select name="category" defaultValue={filters.category ?? ""}>
            <option value="">All</option>
            {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
          </select>
        </label>
        <label>Rating
          <select name="rating" defaultValue={filters.rating ?? ""}>
            <option value="">Any</option>
            {Object.entries(RATING_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>Status
          <select name="status" defaultValue={filters.status ?? ""}>
            <option value="">Any</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        <label>Sort
          <select name="sort" defaultValue={filters.sort ?? "newest"}>
            {Object.entries(SORTS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
        {filters.tags?.map((t) => <input key={`${t.type}:${t.slug}`} type="hidden" name="tag" value={`${t.type}:${t.slug}`} />)}
        <button type="submit">Show</button>
      </form>
      {!!filters.tags?.length && (
        <p className="active-tags">
          Tags: {filters.tags.map((t) => `${TAG_TYPE_LABELS[t.type]}: ${t.slug}`).join(", ")} · <Link href="/browse">Clear</Link>
        </p>
      )}
      {fics.length === 0 && posts.length === 0 && <p>Nothing matches these filters.</p>}
      {fics.length > 0 && (
        <section aria-label="Fics" className="card-grid">
          {fics.map((f) => <FicCard key={f.slug} fic={f} />)}
        </section>
      )}
      {posts.length > 0 && (
        <section aria-label="Posts" className="card-grid">
          {posts.map((p) => <PostCard key={p.slug} post={p} />)}
        </section>
      )}
    </main>
  );
}
