"use client";
import { useMemo, useState } from "react";
import FicCard from "./FicCard";
import type { FicCardData } from "@/lib/content/queries";

export type FicGroup = { name: string; slug: string | null; fics: FicCardData[] };
type Sort = "newest" | "title" | "hearts";

const haystack = (f: FicCardData, fandom: string) =>
  [f.title, fandom, ...f.tags.filter((t) => t.type === "relationship").map((t) => t.name)].join(" ").toLowerCase();

/* The Fic list: a search field and a "Sort by" select above the fandom groups. */
export default function FicListBrowser({ groups }: { groups: FicGroup[] }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<Sort>("newest");
  const shown = useMemo(() => {
    const term = q.trim().toLowerCase();
    const order = (a: FicCardData, b: FicCardData) =>
      sort === "title" ? a.title.localeCompare(b.title)
      : sort === "hearts" ? (b.hearts ?? 0) - (a.hearts ?? 0) || a.title.localeCompare(b.title)
      : b.updatedAt.localeCompare(a.updatedAt);
    return groups
      .map((g) => ({ ...g, fics: g.fics.filter((f) => !term || haystack(f, g.name).includes(term)).sort(order) }))
      .filter((g) => g.fics.length > 0);
  }, [groups, q, sort]);

  return (
    <>
      <div className="fic-tools">
        <label className="fic-search">Search the fic list
          <input type="search" className="keep-case" value={q} onChange={(e) => setQ(e.target.value)} autoComplete="off" />
        </label>
        <label className="fic-sort">Sort by
          <select value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
            <option value="newest">Newest</option><option value="title">Title</option><option value="hearts">Most liked</option>
          </select>
        </label>
      </div>
      {q.trim() && shown.length === 0 && (
        <p role="status" className="empty-note">No fics match that search. <button type="button" className="fic-clear" onClick={() => setQ("")}>Clear the search</button></p>
      )}
      {shown.map((g) => (
        <section key={g.slug ?? "other"} aria-labelledby={`fandom-${g.slug ?? "other"}`} className="page">
          <h2 className="section-bar" id={`fandom-${g.slug ?? "other"}`}>{g.name}</h2>
          <div className="card-grid">{g.fics.map((f) => <FicCard key={f.slug} fic={f} showFandom={false} />)}</div>
        </section>
      ))}
    </>
  );
}
