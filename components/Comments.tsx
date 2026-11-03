import CommentForm from "@/components/CommentForm";
import { getComments, type PublicComment } from "@/lib/comments/queries";
import { formatDate } from "@/lib/format/dates";

function Item({ c, replies }: { c: PublicComment; replies: PublicComment[] }) {
  return (
    <li className="comment" data-author={c.byAuthor}>
      <div className="comment-head">
        <span className="comment-name">{c.name}{c.byAuthor && <span className="comment-badge">Author</span>}</span>
        <span className="muted comment-date">{formatDate(c.createdAt)}</span>
      </div>
      <p className="comment-body">{c.body}</p>
      {replies.length > 0 && <ul className="comment-replies">{replies.map((r) => <Item key={r.id} c={r} replies={[]} />)}</ul>}
    </li>
  );
}

/* The comments on one chapter, then the form. */
export default async function Comments({ slug, n }: { slug: string; n: number }) {
  const list = await getComments(slug, n);
  const top = list.filter((c) => c.parentId === null);
  const repliesOf = (id: number) => list.filter((c) => c.parentId === id);
  return (
    <section aria-labelledby="comments-heading" className="comments">
      <h2 id="comments-heading" tabIndex={-1} className="section-bar">Comments on chapter {n} ({list.length})</h2>
      {top.length > 0
        ? <ul className="comment-list">{top.map((c) => <Item key={c.id} c={c} replies={repliesOf(c.id)} />)}</ul>
        : <p className="empty-note">No comments on this chapter yet.</p>}
      <CommentForm slug={slug} n={n} />
    </section>
  );
}
