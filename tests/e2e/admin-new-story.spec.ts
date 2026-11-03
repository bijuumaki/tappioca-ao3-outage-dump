import { expect, test } from "@playwright/test";
import { secretClient } from "../support/supabase-admin";
import { signIn, saveDetails } from "./admin-helpers";

// These tests share one cleanup step, so they run one after another.
test.describe.configure({ mode: "serial" });

async function cleanUp() {
  const db = secretClient();
  const { data } = await db.from("fics").select("id, cover_path").like("title", "(e2e%");
  for (const f of data ?? []) {
    if (f.cover_path) await db.storage.from("media").remove([f.cover_path]);
    await db.from("fics").delete().eq("id", f.id);
  }
  await db.from("tags").delete().like("name", "(e2e%");
}
test.beforeAll(cleanUp);
test.afterAll(async () => { if (!process.env.KEEP_E2E) await cleanUp(); });

test("new story: fill details, save, see it in the list, reopen with everything kept", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Add new story" }).click();
  await page.waitForURL(/\/admin\/stories\/\d+$/);
  const editUrl = page.url();

  await page.getByLabel("Story title").fill("(e2e story)");
  await page.getByLabel("Fandom").fill("(e2e fandom)");
  await page.getByLabel("Rating").selectOption({ label: "Teen and Up" });
  await page.getByLabel("Relationships").fill("(e2e a)/(e2e b), (e2e c)/(e2e d)");
  await page.getByLabel("Characters").fill("(e2e a)");
  await page.getByLabel("Summary").fill("(e2e summary)");
  await page.getByLabel("Tags", { exact: true }).fill("(e2e tag)");
  await saveDetails(page);

  await page.goto("/admin");
  const row = page.locator(".a-story", { hasText: "(e2e story)" });
  await expect(row).toContainText(/teen and up/i);
  await expect(row).toContainText(/draft/i);
  await expect(row).toContainText("(e2e fandom)");

  await page.goto(editUrl);
  await expect(page.getByLabel("Story title")).toHaveValue("(e2e story)");
  await expect(page.getByLabel("Fandom")).toHaveValue("(e2e fandom)");
  await expect(page.getByLabel("Relationships")).toHaveValue("(e2e a)/(e2e b), (e2e c)/(e2e d)");
  await expect(page.getByLabel("Characters")).toHaveValue("(e2e a)");
  await expect(page.getByLabel("Summary")).toHaveValue("(e2e summary)");
  await expect(page.getByLabel("Tags", { exact: true })).toHaveValue("(e2e tag)");
});

test("chapters: a new story has chapter 1, and add chapter makes chapter 2", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Add new story" }).click();
  await page.waitForURL(/\/admin\/stories\/\d+$/);
  await page.getByLabel("Story title").fill("(e2e chapters)");
  await page.getByRole("button", { name: "Save details" }).click();
  const list = page.locator('[aria-label="Chapters"] li');
  await expect(list).toHaveCount(1);
  await page.getByRole("button", { name: "+ Add chapter" }).click();
  await expect(list).toHaveCount(2);
  await expect(list.nth(1)).toContainText(/chapter 2/i);
  await expect(list.nth(1).locator('[aria-current="page"]')).toHaveCount(1);
});

