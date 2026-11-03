import type { Metadata } from "next";
import Link from "next/link";
import AdminHeader from "@/components/admin/AdminHeader";
import DriveLibrary from "@/components/admin/DriveLibrary";
import UploadBin, { type BinFic } from "@/components/admin/UploadBin";
import { listAdminStories } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/supabase/session";

export const metadata: Metadata = { title: "Uploads" };
export const dynamic = "force-dynamic";
/* Converting and saving to Drive can take a while for a long book; give the actions on this screen a minute. */
export const maxDuration = 60;

export default async function UploadsPage() {
  const { db } = await requireAdmin();
  const [stories, { data: files }] = await Promise.all([
    listAdminStories(db),
    db.from("upload_files").select("fic_id, filename, status, error, created_at").order("created_at", { ascending: false }),
  ]);
  const fics: BinFic[] = stories.map((s) => ({
    id: s.id, slug: s.slug, title: s.title, status: s.status, chapters: s.chapters,
    files: (files ?? []).filter((f) => f.fic_id === s.id).map((f) => ({ filename: f.filename, status: f.status, error: f.error })),
  }));
  return (
    <main className="a-page">
      <AdminHeader title="Uploads">
        <Link href="/admin" className="a-link">Back to all stories</Link>
      </AdminHeader>
      <DriveLibrary />
      <UploadBin fics={fics} />
    </main>
  );
}
