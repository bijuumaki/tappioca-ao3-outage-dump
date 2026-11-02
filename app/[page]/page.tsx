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
  return (
    <main className="page" id="main">
      <h1 className="heading">{page.title}</h1>
      {page.body ? <RichText html={page.body} /> : <p className="empty-note">(nothing here yet)</p>}
    </main>
  );
}
