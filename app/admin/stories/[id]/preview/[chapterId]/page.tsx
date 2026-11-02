import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChapterBody from "@/components/ChapterBody";
import { requireAdmin } from "@/lib/supabase/session";
import { formatWords } from "@/lib/format/words";

export const metadata: Metadata = { title: "Preview" };
export const dynamic = "force-dynamic";

/* Draft preview for the admin only, in the reader's look. */
export default async function PreviewPage({ params }: { params: Promise<{ id: string; chapterId: string }> }) {
  const { db } = await requireAdmin();
  const { id, chapterId } = await params;
  const { data: chapter } = await db.from("chapters").select("*").eq("id", Number(chapterId)).eq("fic_id", Number(id)).maybeSingle();
  if (!chapter) notFound();
  const { data: fic } = await db.from("fics").select("title").eq("id", chapter.fic_id).single();
  return (
    <div className="a-preview">
      <p className="a-preview-flag" role="note">Preview: only you can see this page.</p>
      <main className="page" id="main">
        <header className="reader-header">
          <h1 className="page-title">{fic?.title}</h1>
          <p className="chapter-label">{formatWords(chapter.word_count)}</p>
        </header>
        {chapter.title && <h2 className="section-bar chapter-title">{chapter.title}</h2>}
        <ChapterBody id={`preview/${chapter.id}`} chapter={chapter} />
      </main>
    </div>
  );
}
