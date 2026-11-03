import type { Metadata } from "next";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import CommentRow from "@/components/admin/CommentRow";
import CommentStoryFilter from "@/components/admin/CommentStoryFilter";
import { commentCounts, listAdminComments, storiesWithComments, type CommentStatus } from "@/lib/admin/comments";
import { requireAdmin } from "@/lib/supabase/session";

export const metadata: Metadata = { title: "Comments" };
export const dynamic = "force-dynamic";

const TABS: [CommentStatus, string][] = [["waiting", "Waiting"], ["approved", "Approved"], ["all", "All"]];
const EMPTY: Record<CommentStatus, string> = {
  waiting: "Nothing is waiting for approval.", approved: "No approved comments here yet.", all: "No comments here yet.",
};

export default async function CommentsScreen({ searchParams }: { searchParams: Promise<{ before?: string; status?: string; story?: string }> }) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const status: CommentStatus = sp.status === "approved" || sp.status === "all" ? sp.status : "waiting";
  const ficId = Number.isInteger(Number(sp.story)) && Number(sp.story) > 0 ? Number(sp.story) : undefined;
  const before = Number(sp.before);
  const [{ comments, next }, counts, stories] = await Promise.all([
    listAdminComments(db, { before: Number.isInteger(before) && before > 0 ? before : undefined, status, ficId }),
    commentCounts(db, ficId),
    storiesWithComments(db),
  ]);
  const href = (s: CommentStatus, story = ficId) => `/admin/comments?status=${s}${story ? `&story=${story}` : ""}`;
  return (
    <main className="a-page">
      <AdminHeader title="Comments" />
      <p className="a-muted">New comments wait here until you approve them. Only approved comments show under a chapter.</p>
      <div className="a-filter-row">
        <nav aria-label="Filter by status" className="a-tabs">
          {TABS.map(([id, label]) => (
            <Link key={id} href={href(id)} aria-current={status === id ? "true" : undefined}>{label} <span>{counts[id]}</span></Link>
          ))}
        </nav>
        <CommentStoryFilter stories={stories} value={ficId} status={status} />
      </div>
      {comments.length === 0
        ? <p className="a-muted">{EMPTY[status]}</p>
        : <ul className="a-comments">{comments.map((c) => <CommentRow key={c.id} c={c} />)}</ul>}
      {next && <Link href={`${href(status)}&before=${next}`} className="a-button">Older comments</Link>}
    </main>
  );
}
