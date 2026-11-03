import Link from "next/link";
import ContinueReading from "@/components/ContinueReading";
import FicCard from "@/components/FicCard";
import PostCard from "@/components/PostCard";
import RichText from "@/components/RichText";
import { mediaUrl } from "@/lib/content/media";
import { getHomeData, getSnippet } from "@/lib/content/queries";
import { fandomNames, lengthLine, ratingAndRelationships } from "@/lib/format/fic-meta";

export const revalidate = 60;

const ROWS = [["/disclaimer", "Disclaimer"], ["/about", "About"], ["/fics", "Fic List"], ["/links", "Links"]] as const;

export default async function Home() {
  const [home, howdy, archive] = await Promise.all([getHomeData(), getSnippet("howdy"), getSnippet("archive")]);
  const f = home.featured;
  return (
    <main className="page" id="main">
      <h1 className="page-title home-title"><Link href="/">Tappioca’s Fic Archive</Link></h1>

      <section className="home-intro">
        <div className="home-side">
          <div className="photo" aria-hidden="true" />
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

      {f && (
        <>
          <h2 className="section-bar">Featured: {f.title}</h2>
          <Link href={`/fics/${f.slug}`} className="featured">
            <span className="featured-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {f.cover_path && <img src={mediaUrl(f.cover_path)} alt="" />}
            </span>
            <span className="featured-body">
              <span className="featured-title">{f.title}</span>
              {f.summary && <span className="featured-summary keep-case">{f.summary.replace(/<[^>]*>/g, " ").trim()}</span>}
              <span className="featured-meta">{[fandomNames(f), ratingAndRelationships(f), lengthLine(f)].filter(Boolean).join(" · ")}</span>
            </span>
          </Link>
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
