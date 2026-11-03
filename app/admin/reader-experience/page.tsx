import type { Metadata } from "next";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import ReaderMarkRow from "@/components/admin/ReaderMarkRow";
import { listReaderMarks, type ReaderMark } from "@/lib/admin/reader-marks";
import { requireAdmin } from "@/lib/supabase/session";

export const metadata: Metadata = { title: "Reader experience" };
export const dynamic = "force-dynamic";

function group<T>(items: T[], key: (t: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const i of items) map.set(key(i), [...(map.get(key(i)) ?? []), i]);
  return [...map.entries()];
}

export default async function ReaderExperience({ searchParams }: { searchParams: Promise<{ view?: string; show?: string }> }) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const byReader = sp.view === "reader";
  const notesOnly = sp.show === "notes";
  let marks: ReaderMark[] = [];
  let missing = false;
  try { marks = await listReaderMarks(db, notesOnly); } catch { missing = true; }
  const href = (view: string, show: string) => `/admin/reader-experience?view=${view}&show=${show}`;
  const view = byReader ? "reader" : "story";
  const show = notesOnly ? "notes" : "all";
  const readers = new Set(marks.map((m) => m.reader)).size;
  const sorted = [...marks].sort((a, b) => a.slug.localeCompare(b.slug) || a.n - b.n || a.start - b.start);
  const groups = byReader ? group(marks, (m) => m.reader) : group(sorted, (m) => m.slug);
  return (
    <main className="a-page">
      <AdminHeader title="Reader experience" />
      <p className="a-muted">What readers highlighted and wrote in the chapters. Each reader is a made-up name, so you can follow one reader&apos;s taste without knowing who they are. Readers can turn sharing off in the Aa panel.</p>
      {missing ? (
        <p className="a-muted">This isn&apos;t set up yet: run <code>supabase/migrations/0016_reader_marks.sql</code> in the Supabase SQL editor.</p>
      ) : (
        <>
          <div className="a-filter-row">
            <nav aria-label="Group by" className="a-tabs">
              <Link href={href("story", show)} aria-current={view === "story" ? "true" : undefined}>By story</Link>
              <Link href={href("reader", show)} aria-current={view === "reader" ? "true" : undefined}>By reader</Link>
            </nav>
            <nav aria-label="Show" className="a-tabs">
              <Link href={href(view, "all")} aria-current={show === "all" ? "true" : undefined}>Highlights and notes</Link>
              <Link href={href(view, "notes")} aria-current={show === "notes" ? "true" : undefined}>Notes only</Link>
            </nav>
          </div>
          <p className="a-muted">{marks.length} {marks.length === 1 ? "item" : "items"} from {readers} {readers === 1 ? "reader" : "readers"}{marks.length >= 1000 ? " (newest 1000 shown)" : ""}.</p>
          {marks.length === 0 && <p className="a-muted">{notesOnly ? "No notes yet." : "No highlights yet."}</p>}
          {groups.map(([key, items]) => (
            <section key={key} className="a-rx-group" aria-label={byReader ? items[0].name : items[0].fic || key}>
              <h2 className="a-rx-title">{byReader ? `${items[0].name} · ${items.length}` : `${items[0].fic || key} · ${items.length}`}</h2>
              <ul className="a-comments">{items.map((m) => <ReaderMarkRow key={m.id} m={m} showReader={!byReader} />)}</ul>
            </section>
          ))}
        </>
      )}
    </main>
  );
}
