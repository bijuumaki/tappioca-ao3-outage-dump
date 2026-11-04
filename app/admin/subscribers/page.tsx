import type { Metadata } from "next";
import AdminHeader from "@/components/admin/AdminHeader";
import { summarize, type FeedHit } from "@/lib/feed/stats";
import { requireAdmin } from "@/lib/supabase/session";

export const metadata: Metadata = { title: "Subscribers" };
export const dynamic = "force-dynamic";
const WINDOW_DAYS = 14;

export default async function Subscribers() {
  const { db } = await requireAdmin();
  const since = new Date(Date.now() - WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  const { data, error } = await db.from("feed_hits").select("day,feed,visitor,app,subs").gte("day", since).limit(20000);
  if (error) {
    return (
      <main className="a-page">
        <AdminHeader title="Subscribers" />
        <p className="a-muted">This isn&apos;t set up yet: run <code>supabase/migrations/0017_feed_hits.sql</code> in the Supabase SQL editor.</p>
      </main>
    );
  }
  const hits = data as FeedHit[];
  const { total, feeds, days } = summarize(hits);
  const { data: fics } = await db.from("fics").select("slug,title");
  const title = (feed: string) => (feed === "all" ? "All stories" : fics?.find((f) => f.slug === feed)?.title ?? feed);
  return (
    <main className="a-page">
      <AdminHeader title="Subscribers" />
      <p className="a-muted">
        RSS has no sign-up list, so this is an estimate from the last {WINDOW_DAYS} days. A feed reader checks the feed again and again, so an app seen on 2 or more different days counts as a subscriber. Big services such as Feedly say how many followers they have, and that number is added. Nobody&apos;s address is kept, only a scrambled code.
      </p>
      {hits.length === 0 ? (
        <p className="a-muted">No one has fetched a feed yet. This starts counting from the first check after this page was set up.</p>
      ) : (
        <>
          <h2 className="a-rx-title">About {total.subscribers} {total.subscribers === 1 ? "subscriber" : "subscribers"}</h2>
          <p className="a-muted">{total.regular} regular {total.regular === 1 ? "reader" : "readers"} + {total.claimed} reported by services · {total.seenOnce} seen once (could be a visitor trying it) · {total.browsers} opened it in a browser</p>
          {total.apps.length > 0 && (
            <section aria-label="Apps"><h2 className="a-rx-title">Reader apps</h2>
              <ul className="a-comments">{total.apps.map((a) => <li key={a.app}>{a.app} · {a.people}</li>)}</ul></section>
          )}
          <section aria-label="By feed"><h2 className="a-rx-title">By feed</h2>
            <ul className="a-comments">{feeds.map((f) => <li key={f.feed}>{title(f.feed)} · about {f.subscribers} <span className="a-muted">({f.seenOnce} seen once)</span></li>)}</ul></section>
          <section aria-label="Per day"><h2 className="a-rx-title">Readers checking each day</h2>
            <ul className="a-comments">{days.map((d) => <li key={d.day}>{d.day} · {d.readers}</li>)}</ul></section>
        </>
      )}
    </main>
  );
}
