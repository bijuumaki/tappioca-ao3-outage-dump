import Link from "next/link";
import { getHomeFeed } from "@/lib/content/queries";
import { formatDate } from "@/lib/format/dates";

export const revalidate = 60;

const KIND_LABELS = { fic: "New fic", chapter: "New chapter", post: "New post" } as const;

export default async function Home() {
  const feed = await getHomeFeed();
  return (
    <main className="page" id="main">
      <h1 className="heading">Latest updates</h1>
      {feed.length === 0 ? (
        <p>Nothing posted yet.</p>
      ) : (
        <ol className="feed">
          {feed.map((item) => (
            <li key={`${item.kind}:${item.href}`} className="box">
              <span className="feed-kind">{KIND_LABELS[item.kind]}</span>
              <Link href={item.href}>{item.title}</Link>
              {item.ficTitle && <span className="feed-fic"> of {item.ficTitle}</span>}
              <time dateTime={item.publishedAt}>{formatDate(item.publishedAt)}</time>
            </li>
          ))}
        </ol>
      )}
      <p><Link href="/browse">Browse everything →</Link></p>
    </main>
  );
}
