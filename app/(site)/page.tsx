import Link from "next/link";
import ContinueReading from "@/components/ContinueReading";
import FicCard from "@/components/FicCard";
import PostCard from "@/components/PostCard";
import SitePhoto from "@/components/SitePhoto";
import RichText from "@/components/RichText";
import { mediaUrl } from "@/lib/content/media";
import { parsePhoto } from "@/lib/content/photo";
import { getHomeData, getSnippet } from "@/lib/content/queries";
import { formatDate } from "@/lib/format/dates";

export const revalidate = 60;

const ROWS = [["/disclaimer", "Disclaimer"], ["/about", "About"], ["/fics", "Fic List"], ["/links", "Links"]] as const;

export default async function Home() {
  const [home, howdy, archive, photo] = await Promise.all([getHomeData(), getSnippet("howdy"), getSnippet("archive"), getSnippet("photo")]);
  const photoFrame = parsePhoto(photo);
  return (
    <main className="page" id="main">
      <h1 className="page-title home-title"><Link href="/">Tappioca’s Fic Archive</Link></h1>

      <section className="home-intro">
        <div className="home-side">
          <SitePhoto photo={photoFrame ? { url: mediaUrl(photoFrame.path), zoom: photoFrame.zoom, x: photoFrame.x, y: photoFrame.y } : null} />
          <section aria-label="About this archive" className="archive-box">
            <h2>The Archive</h2>
            {archive && <RichText html={archive} />}
            <p className="archive-count">{home.storyCount === 1 ? "1 story" : `${home.storyCount} stories`}</p>
            <ul>
              {home.fandoms.map((g) => (
                <li key={g.slug}><Link href={`/tags/fandom/${g.slug}`}>{g.name}</Link><span>{g.count}</span></li>
              ))}
            </ul>
          </section>
        </div>
        <div className="home-main">
          <div className="box howdy">
            <h2>Howdy</h2>
            {howdy ? <RichText html={howdy} /> : <p className="empty-note">(intro coming soon)</p>}
          </div>
          <nav aria-label="Pages" className="pages-nav">
            {ROWS.map(([href, label]) => (
              <Link key={href} href={href} className="home-row"><span>{label}</span></Link>
            ))}
          </nav>
        </div>
      </section>

      {home.activity.length > 0 && (
        <>
          <h2 className="section-bar">Latest activity</h2>
          <ul aria-label="Latest activity" className="activity">
            {home.activity.map((a) => (
              <li key={`${a.kind}/${a.slug}/${a.n}/${a.at}`}>
                <Link href={a.kind === "comment" ? `/fics/${a.slug}/${a.n}#comments-heading` : `/fics/${a.slug}`}>
                  <span className="activity-text">
                    <span className="activity-kind">{a.kind === "story" ? "New story" : a.kind === "chapter" ? "New chapter" : "New comment"}</span>
                    <span className="activity-title">{a.kind === "story" ? a.title : `${a.title} · Chapter ${a.n}`}</span>
                  </span>
                  <span className="activity-when">{formatDate(a.at)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}

      {home.moreFics.length > 0 && (
        <>
          <h2 className="section-bar">More stories</h2>
          <section aria-label="More stories" className="card-grid">
            {home.moreFics.map((fic) => <FicCard key={fic.slug} fic={fic} />)}
          </section>
        </>
      )}

      {home.recentPosts.length > 0 && (
        <>
          <h2 className="section-bar">Recent Art</h2>
          <section aria-label="Recent art" className="card-grid">
            {home.recentPosts.map((p) => <PostCard key={p.slug} post={p} />)}
          </section>
        </>
      )}

      <ContinueReading />
    </main>
  );
}
