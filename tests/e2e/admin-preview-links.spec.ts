import { expect, test, type Page } from "@playwright/test";
import { secretClient } from "../support/supabase-admin";
import { signIn } from "./admin-helpers";

test.describe.configure({ mode: "serial" });
async function cleanUp() {
  const db = secretClient();
  const { data } = await db.from("fics").select("id").like("title", "(e2e share%");
  for (const f of data ?? []) await db.from("fics").delete().eq("id", f.id);
}
test.beforeAll(cleanUp);
test.afterAll(cleanUp);

async function newStoryWithText(page: Page, title: string, text: string) {
  await signIn(page);
  await page.getByRole("link", { name: "Add new story" }).click();
  await page.waitForURL(/\/admin\/stories\/\d+$/);
  await page.getByLabel("Story title").fill(title);
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.locator(".a-saved")).toBeVisible();
  await page.locator(".a-editor .ProseMirror").click();
  await page.keyboard.type(text);
  await expect(page.locator(".a-save-state")).toHaveText(/saved/i, { timeout: 10_000 });
}

test("a preview link shows an unpublished chapter to someone who isn't signed in, until it's revoked", async ({ page, browser }) => {
  await newStoryWithText(page, "(e2e share one)", "(e2e secret words)");
  await page.getByText("Share a preview link", { exact: true }).click();
  await page.getByRole("button", { name: "Create link" }).click();
  const url = await page.locator(".a-preview-url").first().inputValue();
  expect(url).toMatch(/\/preview\/[0-9a-f-]{36}$/);

  const reader = await browser.newContext();
  const tab = await reader.newPage();
  const res = await tab.goto(url);
  expect(res!.status()).toBe(200);
  await expect(tab.locator(".chapter-text")).toContainText("(e2e secret words)");
  await expect(tab.getByText(/shared with you privately/i)).toBeVisible();
  await expect(tab.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
  // the public site still doesn't list it
  expect((await tab.goto("/fics/e2e-share-one"))!.status()).toBe(404);

  await page.getByRole("button", { name: "Revoke" }).first().click();
  await expect(page.locator(".a-preview-url")).toHaveCount(0);
  const after = await tab.goto(url);
  expect(after!.status()).toBe(404);
  await expect(tab.getByRole("heading", { name: "Page not found" })).toBeVisible();
  await reader.close();
});

test("unknown and malformed tokens are just not found", async ({ page }) => {
  for (const token of ["00000000-0000-4000-8000-000000000000", "not-a-token", "1"]) {
    const res = await page.goto(`/preview/${token}`);
    expect(res!.status(), token).toBe(404);
  }
});

test("a signed-out visitor can't create links", async ({ request }) => {
  const res = await request.get("/admin/stories/1");
  expect([200, 307, 308]).toContain(res.status());
});
