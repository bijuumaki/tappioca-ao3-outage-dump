import type { Metadata } from "next";
import Link from "next/link";
import FicListBrowser from "@/components/FicListBrowser";
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
      {groups.length > 0 && <FicListBrowser groups={groups} />}
      <p><Link href="/browse" className="muted browse-link">Filter by rating, status or tag →</Link></p>
    </main>
  );
}
