import { expect, test, type Page } from "@playwright/test";
import { secretClient } from "../support/supabase-admin";
import { signIn } from "./admin-helpers";

test.describe.configure({ mode: "serial" });

async function cleanUp() {
  const db = secretClient();
  const { data } = await db.from("fics").select("id").like("title", "(e2e publish%");
  for (const f of data ?? []) await db.from("fics").delete().eq("id", f.id);
}
test.beforeAll(cleanUp);
test.afterAll(cleanUp);

async function write(page: Page, title: string, text: string) {
  await signIn(page);
  await page.getByRole("link", { name: "Add new story" }).click();
  await page.waitForURL(/\/admin\/stories\/\d+$/);
  await page.getByLabel("Story title").fill(title);
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.locator(".a-saved")).toBeVisible();
  await page.locator(".a-editor .ProseMirror").click();
  await page.keyboard.type(text);
}

test("preview shows the draft; publish puts it on the public site", async ({ page, context }) => {
  await write(page, "(e2e publish now)", "(e2e text)");
  const [preview] = await Promise.all([context.waitForEvent("page"), page.getByRole("button", { name: "Preview" }).click()]);
  await expect(preview.locator(".chapter-text")).toContainText("(e2e text)");
  await expect(preview.getByText(/preview/i).first()).toBeVisible();
  await preview.close();

  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.locator(".a-pub-state")).toHaveText(/published/i);
  const res = await page.goto("/fics/e2e-publish-now");
  expect(res!.status()).toBe(200);
  await expect(page.locator(".chapter-text")).toContainText("(e2e text)");
});

test("scheduling for tomorrow shows scheduled and stays off the public site", async ({ page }) => {
  await write(page, "(e2e publish later)", "(e2e later)");
  await page.getByRole("button", { name: "Schedule" }).click();
  const tomorrow = new Date(Date.now() + 26 * 3_600_000).toLocaleString("sv-SE", { timeZone: "Asia/Manila" }).slice(0, 16).replace(" ", "T");
  await page.getByLabel("Publish on").fill(tomorrow);
  await page.getByRole("button", { name: "Confirm schedule" }).click();
  await expect(page.locator(".a-pub-state")).toHaveText(/scheduled/i);
  await page.goto("/admin");
  await expect(page.locator(".a-story", { hasText: "(e2e publish later)" })).toContainText(/scheduled/i);
  const res = await page.goto("/fics/e2e-publish-later");
  expect(res!.status()).toBe(404);
});

test("publish saves the title and details even without pressing Save details", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Add new story" }).click();
  await page.waitForURL(/\/admin\/stories\/\d+$/);
  await page.getByLabel("Story title").fill("(e2e publish titled)");
  await page.getByLabel("Summary").fill("(e2e unsaved summary)");
  await page.locator(".a-editor .ProseMirror").click();
  await page.keyboard.type("(e2e body)");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.locator(".a-pub-state")).toHaveText(/published/i);
  const res = await page.goto("/fics/e2e-publish-titled");
  expect(res!.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("(e2e publish titled)");
  await expect(page.locator("main")).toContainText("(e2e unsaved summary)");
});

test("story details save on their own after typing stops", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Add new story" }).click();
  await page.waitForURL(/\/admin\/stories\/\d+$/);
  await page.getByLabel("Story title").fill("(e2e publish autosave details)");
  await page.getByLabel("Tags", { exact: true }).fill("(e2e auto tag)");
  await expect(page.locator(".a-saved")).toBeVisible({ timeout: 10_000 });
  await page.reload();
  await expect(page.getByLabel("Story title")).toHaveValue("(e2e publish autosave details)");
  await expect(page.getByLabel("Tags", { exact: true })).toHaveValue("(e2e auto tag)");
});

test("publishing while the details are still saving keeps the right title and address", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Add new story" }).click();
  await page.waitForURL(/\/admin\/stories\/\d+$/);
  await page.locator(".a-editor .ProseMirror").click();
  await page.keyboard.type("(e2e race body)");
  await page.getByLabel("Story title").fill("(e2e publish race)");
  await page.waitForTimeout(2050);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(page.locator(".a-pub-state")).toHaveText(/published/i);
  const res = await page.goto("/fics/e2e-publish-race");
  expect(res!.status()).toBe(200);
});
