import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import StoryList from "@/components/admin/StoryList";
import { signOut } from "@/lib/admin/auth-actions";
import { listAdminStories } from "@/lib/admin/queries";
import type { StoryStatus } from "@/lib/admin/status";
import { requireAdmin } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

const TABS = [["all", "All"], ["published", "Published"], ["drafts", "Drafts"]] as const;
const inTab = (tab: string, s: StoryStatus) => tab === "all" || (tab === "drafts" ? s === "draft" : s !== "draft");

type Search = { status?: string; fandom?: string };

export default async function StoriesPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { db } = await requireAdmin();
  const sp = await searchParams;
  const tab = TABS.some(([v]) => v === sp.status) ? sp.status! : "all";
  const fandom = sp.fandom ?? "";
  const all = await listAdminStories(db);
  const fandoms = [...new Map(all.filter((s) => s.fandomSlug).map((s) => [s.fandomSlug!, s.fandom!])).entries()].sort((a, b) => a[1].localeCompare(b[1]));
  const inFandom = all.filter((s) => !fandom || s.fandomSlug === fandom);
  const rows = inFandom.filter((s) => inTab(tab, s.status));
  const href = (t: string) => `/admin?${new URLSearchParams({ ...(t !== "all" ? { status: t } : {}), ...(fandom ? { fandom } : {}) })}`;

  return (
    <main className="a-page">
      <AdminHeader title="Stories">
        <Link href="/admin/stories/new" className="a-add a-add-desktop"><span aria-hidden="true">+</span>Add new story</Link>
        <form action={signOut}><button type="submit" className="a-button">Sign out</button></form>
      </AdminHeader>

      <div className="a-toolbar">
        <nav aria-label="Filter by status" className="a-tabs">
          {TABS.map(([v, l]) => (
            <Link key={v} href={href(v)} aria-current={tab === v ? "page" : undefined}>
              {l} <span className="a-count">{inFandom.filter((s) => inTab(v, s.status)).length}</span>
            </Link>
          ))}
        </nav>
        <form method="get" className="a-filter">
          {tab !== "all" && <input type="hidden" name="status" value={tab} />}
          <label htmlFor="fandom-filter">Fandom</label>
          <select id="fandom-filter" name="fandom" defaultValue={fandom}>
            <option value="">All fandoms</option>
            {fandoms.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}
          </select>
          <button type="submit" className="a-button">Show</button>
        </form>
      </div>

      {rows.length === 0 ? (
        <section className="a-card a-empty">
          <p>{tab === "drafts" ? "No drafts here yet." : tab === "published" ? "Nothing published here yet." : "No stories here yet."}</p>
          <Link href="/admin/stories/new" className="a-button">Start a new story</Link>
        </section>
      ) : (
        <StoryList rows={rows} />
      )}
      <div role="group" aria-label="Add story" className="a-add-bar">
        <Link href="/admin/stories/new" className="a-add"><span aria-hidden="true">+</span>Add new story</Link>
      </div>
    </main>
  );
}
