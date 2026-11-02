import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RichText from "@/components/RichText";
import TagList from "@/components/TagList";
import { mediaUrl } from "@/lib/content/media";
import { getPost } from "@/lib/content/queries";
import { formatDate } from "@/lib/format/dates";

export const revalidate = 60;

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = await getPost((await params).slug);
  return { title: post?.title ?? "Not found" };
}

export default async function PostPage({ params }: Props) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  return (
    <main className="page" id="main">
      <h1 className="heading">{post.title}</h1>
      <p className="card-meta">{post.category.name}{post.publish_at ? ` · ${formatDate(post.publish_at)}` : ""}</p>
      {post.images.map((img) => (
        <figure key={img.id} className="post-image">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={mediaUrl(img.path)} alt={img.caption || ""} />
          {img.caption && <figcaption>{img.caption}</figcaption>}
        </figure>
      ))}
      {post.body && <RichText html={post.body} />}
      {post.embed_url && (
        <p className="post-embed"><a href={post.embed_url} rel="noopener noreferrer" target="_blank">Open the link ↗</a></p>
      )}
      <div className="box"><TagList tags={post.tags} /></div>
    </main>
  );
}
