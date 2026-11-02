import type { Metadata } from "next";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import RichField from "@/components/admin/RichField";
import { PAGE_TEXTS } from "@/lib/admin/page-texts";
import { requireAdmin } from "@/lib/supabase/session";

export const metadata: Metadata = { title: "Pages" };
export const dynamic = "force-dynamic";

export default async function PagesScreen() {
  const { db } = await requireAdmin();
  const { data } = await db.from("pages").select("slug, body").in("slug", PAGE_TEXTS.map((p) => p.slug));
  const body = (slug: string) => data?.find((p) => p.slug === slug)?.body ?? "";
  return (
    <main className="a-page">
      <AdminHeader title="Pages">
        <Link href="/admin" className="a-link">Back to all stories</Link>
      </AdminHeader>
      <p className="a-muted">The writing on your home, About, Disclaimer, Links and Comms pages. Changes save on their own and show on the site within a minute.</p>
      {PAGE_TEXTS.map((p) => <RichField key={p.slug} slug={p.slug} label={p.label} hint={p.hint} initial={body(p.slug)} />)}
    </main>
  );
}
