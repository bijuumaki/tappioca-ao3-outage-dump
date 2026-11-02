import { beforeAll, describe, expect, test } from "vitest";
import { createReaderClient } from "@/lib/supabase/server";
import { ensureAdmin, ensureUser, hasSecret, signedInClient, TEST_ADMIN, TEST_READER } from "../support/supabase-admin";

describe.skipIf(!hasSecret())("admin rules", () => {
  beforeAll(async () => {
    await ensureAdmin(TEST_ADMIN.email, TEST_ADMIN.password);
    await ensureUser(TEST_READER.email, TEST_READER.password);
  });

  test("the admin can read a draft", async () => {
    const db = await signedInClient(TEST_ADMIN.email, TEST_ADMIN.password);
    const { data } = await db.from("fics").select("slug").eq("slug", "sample-draft");
    expect(data).toEqual([{ slug: "sample-draft" }]);
  });

  test("the admin can add and remove a fic", async () => {
    const db = await signedInClient(TEST_ADMIN.email, TEST_ADMIN.password);
    const { data, error } = await db.from("fics").insert({ slug: "e2e-rule-check", title: "(e2e)", category_id: 1 }).select("id").single();
    expect(error).toBeNull();
    const del = await db.from("fics").delete().eq("id", data!.id);
    expect(del.error).toBeNull();
  });

  test("a signed-in non-admin can't add fics or read drafts", async () => {
    const db = await signedInClient(TEST_READER.email, TEST_READER.password);
    const ins = await db.from("fics").insert({ slug: "e2e-intruder", title: "x", category_id: 1 });
    expect(ins.error).not.toBeNull();
    const { data } = await db.from("fics").select("slug").eq("slug", "sample-draft");
    expect(data).toEqual([]);
  });

  test("the public key can't see the admins list or drafts", async () => {
    const reader = createReaderClient();
    const { data: admins } = await reader.from("admins").select("*");
    expect(admins ?? []).toEqual([]);
    const { data } = await reader.from("fics").select("slug").eq("slug", "sample-draft");
    expect(data).toEqual([]);
  });
});
