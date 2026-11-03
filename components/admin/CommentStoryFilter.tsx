"use client";
import { useRouter } from "next/navigation";

/* The Story select on the Comments screen. It filters as soon as it changes, like the status tabs. */
export default function CommentStoryFilter({ stories, value, status }: { stories: { id: number; title: string }[]; value: number | undefined; status: string }) {
  const router = useRouter();
  return (
    <div className="a-filter">
      <label htmlFor="comment-story">Story</label>
      <select id="comment-story" value={value ?? ""} onChange={(e) => router.push(`/admin/comments?status=${status}${e.target.value ? `&story=${e.target.value}` : ""}`)}>
        <option value="">All stories</option>
        {stories.map((s) => <option key={s.id} value={s.id} className="keep-case">{s.title}</option>)}
      </select>
    </div>
  );
}
