import { expect, test, type Page } from "@playwright/test";
import { secretClient } from "../support/supabase-admin";
import { signIn } from "./admin-helpers";

test.describe.configure({ mode: "serial" });
async function cleanUp() {
  const db = secretClient();
  const { data } = await db.from("fics").select("id").like("title", "(e2e versions%");
  for (const f of data ?? []) await db.from("fics").delete().eq("id", f.id);
}
test.beforeAll(cleanUp);
test.afterAll(cleanUp);

const editor = (page: Page) => page.locator(".a-editor .ProseMirror");
const saved = (page: Page) => expect(page.locator(".a-save-state")).toHaveText(/saved/i, { timeout: 10_000 });

test("publishing keeps a version, and an earlier one can be restored", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Add new story" }).click();
  await page.waitForURL(/\/admin\/stories\/\d+$/);
  await page.getByLabel("Story title").fill("(e2e versions one)");
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.locator(".a-saved")).toBeVisible();
  await editor(page).click();
  await page.keyboard.type("version one");
  await saved(page);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.locator(".a-pub-state")).toHaveText(/published/i);

  await page.keyboard.press("ControlOrMeta+a");
  await editor(page).click();
  await page.keyboard.press("ControlOrMeta+a");
  await page.keyboard.type("version two");
  await saved(page);

  await page.getByText("Earlier versions", { exact: true }).click();
  const versions = page.locator(".a-versions li");
  await expect(versions).toHaveCount(1);
  await expect(versions.first()).toContainText(/published/i);
  await versions.first().getByRole("button", { name: "Restore" }).click();
  await expect(editor(page)).toContainText("version one");
  await expect(editor(page)).not.toContainText("version two");
  // what was replaced is kept too, so the restore can be undone
  await expect(versions).toHaveCount(2);
  await expect(versions.first()).toContainText(/restored/i);
  await page.reload();
  await expect(editor(page)).toContainText("version one");
});

test("a signed-out visitor can't see versions", async ({ request }) => {
  const res = await request.get("/admin/stories/1", { maxRedirects: 0 });
  expect([307, 308]).toContain(res.status());
});
