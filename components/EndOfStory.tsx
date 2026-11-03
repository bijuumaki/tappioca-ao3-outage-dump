import HeartButton from "./HeartButton";

/* Shown under the last chapter: the comment button and an icon-only heart (canvas v127). */
export default function EndOfStory({ slug, hearts }: { slug: string; hearts: number }) {
  return (
    <div className="story-end">
      <a href="#comments-heading" className="story-primary comment-jump">Leave a comment</a>
      <HeartButton slug={slug} count={hearts} iconOnly />
    </div>
  );
}
