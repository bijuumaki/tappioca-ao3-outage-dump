import Link from "next/link";
import type { PostCardData } from "@/lib/content/queries";
import { mediaUrl } from "@/lib/content/media";
import { formatDate } from "@/lib/format/dates";

export default function PostCard({ post }: { post: PostCardData }) {
  return (
    <Link href={`/posts/${post.slug}`} className="card post-card">
      <span className="card-cover">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {post.firstImage && <img src={mediaUrl(post.firstImage.path)} alt="" loading="lazy" />}
      </span>
      <span className="card-body">
        <span className="card-title">{post.title}</span>
        <span className="card-meta">{post.category.name}{post.publish_at ? ` · ${formatDate(post.publish_at)}` : ""}</span>
      </span>
    </Link>
  );
}
