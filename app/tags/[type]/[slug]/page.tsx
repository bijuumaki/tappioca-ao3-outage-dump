import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FicCard from "@/components/FicCard";
import PostCard from "@/components/PostCard";
import { getTagItems } from "@/lib/content/queries";
import { TAG_TYPE_LABELS, TAG_TYPES, type TagType } from "@/lib/content/types";

export const revalidate = 60;

type Props = { params: Promise<{ type: string; slug: string }> };

async function load(params: Props["params"]) {
  const { type, slug } = await params;
  if (!(TAG_TYPES as string[]).includes(type)) return null;
  return getTagItems(type as TagType, slug);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const res = await load(params);
  return { title: res?.tag.name ?? "Not found" };
}

export default async function TagPage({ params }: Props) {
  const res = await load(params);
  if (!res) notFound();
  return (
    <main className="page" id="main">
      <p className="chapter-label">{TAG_TYPE_LABELS[res.tag.type]}</p>
      <h1 className="page-title">{res.tag.name}</h1>
      {res.fics.length === 0 && res.posts.length === 0 && <p>Nothing published with this tag yet.</p>}
      {res.fics.length > 0 && <section aria-label="Fics" className="card-grid">{res.fics.map((f) => <FicCard key={f.slug} fic={f} />)}</section>}
      {res.posts.length > 0 && <section aria-label="Posts" className="card-grid">{res.posts.map((p) => <PostCard key={p.slug} post={p} />)}</section>}
    </main>
  );
}
