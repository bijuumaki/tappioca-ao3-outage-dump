import type { Metadata } from "next";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import CommentRow from "@/components/admin/CommentRow";
import { listAdminComments } from "@/lib/admin/comments";
import { requireAdmin } from "@/lib/supabase/session";

export const metadata: Metadata = { title: "Comments" };
export const dynamic = "force-dynamic";

export default async function CommentsScreen({ searchParams }: { searchParams: Promise<{ before?: string }> }) {
  const { db } = await requireAdmin();
  const before = Number((await searchParams).before);
  const { comments, next } = await listAdminComments(db, { before: Number.isInteger(before) && before > 0 ? before : undefined });
  return (
    <main className="a-page">
      <AdminHeader title="Comments">
        <Link href="/admin" className="a-link">Back to all stories</Link>
      </AdminHeader>
      <p className="a-muted">What readers wrote, newest first. A reply shows on the chapter as yours. Hiding a comment takes it off the site until you show it again.</p>
      {comments.length === 0
        ? <p className="a-muted">No comments yet.</p>
        : <ul className="a-comments">{comments.map((c) => <CommentRow key={c.id} c={c} />)}</ul>}
      {next && <Link href={`/admin/comments?before=${next}`} className="a-button">Older comments</Link>}
    </main>
  );
}
