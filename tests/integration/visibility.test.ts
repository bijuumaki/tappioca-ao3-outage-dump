import { describe, expect, test } from "vitest";
import { createReaderClient } from "@/lib/supabase/server";

const configured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

describe.skipIf(!configured)("what readers can see", () => {
  test("draft fic is not returned", async () => {
    const { data } = await createReaderClient().from("fics").select("slug").eq("slug", "sample-draft");
    expect(data).toEqual([]);
  });

  test("scheduled chapter is hidden; visible positions are 1, 2, 4", async () => {
    const db = createReaderClient();
    const { data: fic } = await db.from("fics").select("id").eq("slug", "sample-fic").single();
    expect(fic).not.toBeNull();
    const { data } = await db.from("chapters").select("position").eq("fic_id", fic!.id).order("position");
    expect(data!.map((c) => c.position)).toEqual([1, 2, 4]);
  });

  test("chapters of a draft fic are hidden even when their own time has passed", async () => {
    const { data } = await createReaderClient().from("chapters").select("id, fics!inner(slug)").eq("fics.slug", "sample-draft");
    expect(data).toEqual([]);
  });

  test("the public key cannot add fics", async () => {
    const { error } = await createReaderClient().from("fics").insert({ slug: "intruder", title: "x", category_id: 1 });
    expect(error).not.toBeNull();
  });
});
