import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ChapterBody from "@/components/ChapterBody";
import { formatWords } from "@/lib/format/words";
import { createReaderClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false }, referrer: "no-referrer" };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/* A chapter shared by secret link. Unknown, malformed and revoked links are all just "not found". */
export default async function SharedPreview({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!UUID.test(token)) notFound();
  const { data, error } = await createReaderClient().rpc("preview_chapter", { p_token: token });
  const row = data?.[0];
  if (error || !row) notFound();
  return (
    <main className="page" id="main">
      <p className="progress-note" role="note">Preview: this was shared with you privately. Please don’t pass the link on.</p>
      <header className="reader-header">
        <h1 className="page-title">{row.fic_title}</h1>
        <p className="chapter-label">{row.chapter_title ?? `Chapter ${row.chapter_position}`} · {formatWords(row.word_count)}</p>
      </header>
      <ChapterBody id={`preview/${token}`} chapter={row} />
    </main>
  );
}
