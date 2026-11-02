import { secretClient } from "./supabase-admin";

/* Sample content the tests read. Added at the start of a test run and removed at the end, so the live site
   only shows it while tests run. Placeholders only, never real fic details. Mirrors supabase/seed.sql. */
const FIC_SLUGS = ["sample-fic", "sample-oneshot", "sample-draft", "sample-empty"];
const ago = (days: number) => new Date(Date.now() - days * 86_400_000).toISOString();

export async function removeFixtures(): Promise<void> {
  const db = secretClient();
  await db.from("fics").delete().in("slug", FIC_SLUGS);
  await db.from("posts").delete().eq("slug", "sample-art");
  await db.from("tags").delete().like("slug", "sample-%");
  await db.from("tags").delete().eq("slug", "draft-only-tag");
}

export async function seedFixtures(): Promise<void> {
  await removeFixtures();
  const db = secretClient();
  const cat = async (slug: string) => (await db.from("categories").select("id").eq("slug", slug).single()).data!.id;
  const ficCat = await cat("fic");
  const artCat = await cat("art");

  const { data: tags, error: te } = await db.from("tags").insert([
    { type: "fandom", name: "(sample fandom)", slug: "sample-fandom" },
    { type: "character", name: "(sample character)", slug: "sample-character" },
    { type: "relationship", name: "(sample relationship)", slug: "sample-relationship" },
    { type: "warning", name: "(sample warning)", slug: "sample-warning" },
    { type: "freeform", name: "(sample tag)", slug: "sample-tag" },
    { type: "relationship", name: "(draft-only tag)", slug: "draft-only-tag" },
  ], { defaultToNull: false }).select("id, slug");
  if (te) throw te;
  const tag = (slug: string) => tags!.find((t) => t.slug === slug)!.id;

  const { data: fics, error: fe } = await db.from("fics").insert([
    { slug: "sample-fic", title: "(sample fic)", summary: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.", notes: "(fic notes)", category_id: ficCat, rating: "teen", status: "in_progress", publish_at: ago(10), featured: true },
    { slug: "sample-oneshot", title: "(sample oneshot)", summary: "Sed do eiusmod tempor incididunt.", category_id: ficCat, rating: "general", status: "complete", publish_at: ago(5) },
    { slug: "sample-draft", title: "(sample draft)", summary: "Draft summary.", category_id: ficCat, rating: "mature", status: "in_progress", publish_at: null },
    { slug: "sample-empty", title: "(sample empty)", summary: "Ut labore et dolore magna aliqua.", category_id: ficCat, rating: "not_rated", status: "in_progress", publish_at: ago(3) },
  ], { defaultToNull: false }).select("id, slug");
  if (fe) throw fe;
  const fic = (slug: string) => fics!.find((f) => f.slug === slug)!.id;

  const { error: ce } = await db.from("chapters").insert([
    { fic_id: fic("sample-fic"), position: 1, title: "(chapter title)", notes_before: "(notes before)", notes_after: "(notes after)",
      body: '<p>Lorem ipsum dolor sit amet.</p><hr><p style="color:#8b3253">Consectetur adipiscing elit sed do.</p>', word_count: 10, publish_at: ago(10) },
    { fic_id: fic("sample-fic"), position: 2, notes_before: "(notes before)",
      body: "<p>Lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor.</p>".repeat(60), word_count: 660, publish_at: ago(8) },
    { fic_id: fic("sample-fic"), position: 3, title: "(scheduled chapter)", body: "<p>Hidden scheduled chapter.</p>", word_count: 3, publish_at: new Date(Date.now() + 365 * 86_400_000).toISOString() },
    { fic_id: fic("sample-fic"), position: 4, body: "<p>Ut enim ad minim veniam.</p>", word_count: 5, publish_at: ago(1) },
    { fic_id: fic("sample-oneshot"), position: 1, body: "<p>Duis aute irure dolor in reprehenderit.</p>", word_count: 6, publish_at: ago(5) },
    { fic_id: fic("sample-draft"), position: 1, body: "<p>Draft text.</p>", word_count: 2, publish_at: ago(5) },
    { fic_id: fic("sample-empty"), position: 1, body: "<p>Not yet.</p>", word_count: 2, publish_at: null },
  ], { defaultToNull: false });
  if (ce) throw ce;

  const allFicTags = ["sample-fandom", "sample-character", "sample-relationship", "sample-warning", "sample-tag"].map((s) => ({ fic_id: fic("sample-fic"), tag_id: tag(s) }));
  const { error: fte } = await db.from("fic_tags").insert([
    ...allFicTags,
    { fic_id: fic("sample-oneshot"), tag_id: tag("sample-fandom") },
    { fic_id: fic("sample-draft"), tag_id: tag("draft-only-tag") },
  ]);
  if (fte) throw fte;

  const { data: post, error: pe } = await db.from("posts").insert({
    slug: "sample-art", title: "(sample art)", body: "<p>Excepteur sint occaecat.</p>", embed_url: "https://example.com/(sample embed)",
    category_id: artCat, publish_at: ago(2),
  }).select("id").single();
  if (pe) throw pe;
  await db.from("post_images").insert([
    { post_id: post!.id, position: 1, path: "/sample-art.svg", caption: "(caption one)" },
    { post_id: post!.id, position: 2, path: "/sample-art.svg", caption: "(caption two)" },
  ]);
  await db.from("post_tags").insert([{ post_id: post!.id, tag_id: tag("sample-fandom") }, { post_id: post!.id, tag_id: tag("sample-tag") }]);
}
