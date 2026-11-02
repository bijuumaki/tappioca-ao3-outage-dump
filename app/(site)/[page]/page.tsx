import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RichText from "@/components/RichText";
import { getPage, PAGE_SLUGS } from "@/lib/content/queries";

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
  const body = page.body ? <RichText html={page.body} /> : <p className="empty-note">(nothing here yet)</p>;
  return (
    <main className={`page ${page.slug}-page`} id="main">
      <h1 className="page-title">{page.title}</h1>
      {page.slug === "about" ? (
        <section className="about">
          <div className="photo" aria-hidden="true" />
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
