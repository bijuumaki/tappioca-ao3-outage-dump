import type { Metadata } from "next";
import Link from "next/link";
import FicCard from "@/components/FicCard";
import { browse, groupByFandom } from "@/lib/content/queries";

export const metadata: Metadata = { title: "Fic List" };
export const revalidate = 60;

export default async function FicList() {
  const { fics } = await browse({ category: "fic", sort: "updated" });
  const groups = groupByFandom(fics);
  return (
    <main className="page" id="main">
      <h1 className="page-title">Fic List</h1>
      {groups.length === 0 && <p className="empty-note">Nothing posted yet.</p>}
      {groups.map((g) => (
        <section key={g.slug ?? "other"} aria-labelledby={`fandom-${g.slug ?? "other"}`} className="page">
          <h2 className="section-bar" id={`fandom-${g.slug ?? "other"}`}>{g.name}</h2>
          <div className="card-grid">{g.fics.map((f) => <FicCard key={f.slug} fic={f} showFandom={false} />)}</div>
        </section>
      ))}
      <p><Link href="/browse" className="muted">Filter by rating, status or tag →</Link></p>
    </main>
  );
}
