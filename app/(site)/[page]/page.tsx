import type { Metadata } from "next";
import { notFound } from "next/navigation";
import SitePhoto from "@/components/SitePhoto";
import InlinePageEditor from "@/components/InlinePageEditor";
import RichText from "@/components/RichText";
import type { PageSlug } from "@/lib/admin/page-texts";
import { mediaUrl } from "@/lib/content/media";
import { getPage, getSnippet, PAGE_SLUGS } from "@/lib/content/queries";

export const revalidate = 60;
export const dynamicParams = false;

export function generateStaticParams() {
  return PAGE_SLUGS.map((page) => ({ page }));
}

type Props = { params: Promise<{ page: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = await getPage((await params).page);
  return { title: page?.title ?? "Not found" };
}

export default async function SimplePage({ params }: Props) {
  const page = await getPage((await params).page);
  if (!page) notFound();
  const photo = page.slug === "about" ? await getSnippet("photo") : "";
  const shown = page.body ? <RichText html={page.body} /> : <p className="empty-note">(nothing here yet)</p>;
  const body = (
    <InlinePageEditor slug={page.slug as PageSlug} label={page.title} initial={page.body ?? ""}>{shown}</InlinePageEditor>
  );
  return (
    <main className={`page ${page.slug}-page`} id="main">
      <h1 className="page-title">{page.title}</h1>
      {page.slug === "about" ? (
        <section className="about">
          <div className="about-photo"><SitePhoto url={photo ? mediaUrl(photo) : null} /></div>
          <div className="box">{body}</div>
        </section>
      ) : page.slug === "links" ? (
        body
      ) : (
        <div className="box">{body}</div>
      )}
    </main>
  );
}
