import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AdminHeader from "@/components/admin/AdminHeader";
import ChapterList from "@/components/admin/ChapterList";
import CoverImage from "@/components/admin/CoverImage";
import Editor from "@/components/admin/Editor";
import StoryDetails from "@/components/admin/StoryDetails";
import { getAdminStory } from "@/lib/admin/queries";
import { mediaUrl } from "@/lib/content/media";
import type { TagType } from "@/lib/content/types";
import { requireAdmin } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ chapter?: string }> };

export async function generateMetadata(): Promise<Metadata> {
  return { title: "Edit story" };
}

export default async function EditStoryPage({ params, searchParams }: Props) {
  const { db } = await requireAdmin();
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const story = await getAdminStory(db, id);
  if (!story) notFound();
  const wanted = Number((await searchParams).chapter);
  const chapter = story.chapters.find((c) => c.id === wanted) ?? story.chapters[0] ?? null;
  const names = (t: TagType) => story.tags.filter((x) => x.type === t).map((x) => x.name).join(", ");
  const { data: fandomTags } = await db.from("tags").select("name").eq("type", "fandom").order("name");

  return (
    <main className="a-page">
      <AdminHeader title={story.title === "Untitled" ? "New Story" : "Edit Story"}>
        <Link href="/admin" className="a-link">Back to all stories</Link>
      </AdminHeader>
      <div className="a-edit">
        <aside className="a-side">
          <StoryDetails
            ficId={story.id}
            fandoms={(fandomTags ?? []).map((t) => t.name)}
            values={{
              summary: story.summary, rating: story.rating, fandom: names("fandom"), relationships: names("relationship"),
              characters: names("character"), warnings: names("warning"), tags: names("freeform"),
            }}
          />
          <CoverImage ficId={story.id} url={story.cover_path ? mediaUrl(story.cover_path) : null} />
          <ChapterList ficId={story.id} chapters={story.chapters} currentId={chapter?.id ?? null} />
        </aside>
        <section className="a-editor-area" aria-label="Editor">
          <label className="a-title-field">
            <span className="sr-only">Story title</span>
            <input form="details-form" name="title" defaultValue={story.title === "Untitled" ? "" : story.title} placeholder="Story title" aria-label="Story title" />
          </label>
          {chapter ? (
            <Editor key={chapter.id} chapterId={chapter.id} initial={{
              title: chapter.title ?? "", notes_before: chapter.notes_before, notes_after: chapter.notes_after, body: chapter.body,
            }} />
          ) : <p className="a-muted">This story has no chapters yet. Add one from the list.</p>}
        </section>
      </div>
    </main>
  );
}
