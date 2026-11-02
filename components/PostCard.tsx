import Link from "next/link";
import type { PostCardData } from "@/lib/content/queries";
import { mediaUrl } from "@/lib/content/media";
import { formatDate } from "@/lib/format/dates";
import TagList from "./TagList";

export default function PostCard({ post }: { post: PostCardData }) {
  return (
    <article className="card post-card box">
      {post.firstImage && (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="card-image" src={mediaUrl(post.firstImage.path)} alt={post.firstImage.caption || ""} loading="lazy" />
      )}
      <h3 className="card-title"><Link href={`/posts/${post.slug}`}>{post.title}</Link></h3>
      <p className="card-meta">{post.category.name}{post.publish_at ? ` · ${formatDate(post.publish_at)}` : ""}</p>
      <TagList tags={post.tags} />
    </article>
  );
}
