import { expect, test, type Page } from "@playwright/test";
import { secretClient } from "../support/supabase-admin";
import { fillBasics, publishViaDialog, signIn } from "./admin-helpers";

test.describe.configure({ mode: "serial" });

async function cleanUp() {
  const db = secretClient();
  const { data } = await db.from("fics").select("id").like("title", "(e2e publish%");
  for (const f of data ?? []) await db.from("fics").delete().eq("id", f.id);
  await db.from("tags").delete().like("name", "(e2e publish%");
  await db.from("tags").delete().like("name", "(e2e auto%");
}
test.beforeAll(cleanUp);
test.afterAll(cleanUp);

async function write(page: Page, title: string, text: string) {
  await signIn(page);
  await page.getByRole("link", { name: "Add new story" }).click();
  await page.waitForURL(/\/admin\/stories\/\d+$/);
  await page.getByLabel("Story title").fill(title);
  await fillBasics(page, { fandom: "(e2e publish fandom)" });
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

  await publishViaDialog(page);
  await expect(page.locator(".a-pub-state")).toHaveText(/published/i);
  const res = await page.goto("/fics/e2e-publish-now/1");
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
  await fillBasics(page, { fandom: "(e2e publish fandom)", summary: "(e2e unsaved summary)" });
  await page.locator(".a-editor .ProseMirror").click();
  await page.keyboard.type("(e2e body)");
  await publishViaDialog(page);
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
  await fillBasics(page, { fandom: "(e2e publish fandom)" });
  await page.waitForTimeout(2050);
  await publishViaDialog(page);
  await expect(page.locator(".a-pub-state")).toHaveText(/published/i);
  const res = await page.goto("/fics/e2e-publish-race");
  expect(res!.status()).toBe(200);
});

test("the publish check lists what is missing and blocks publishing", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Add new story" }).click();
  await page.waitForURL(/\/admin\/stories\/\d+$/);
  await page.getByLabel("Story title").fill("(e2e publish check)");
  await page.locator(".a-editor .ProseMirror").click();
  await page.keyboard.type("(e2e check body)");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading")).toHaveText("3 things to fix before publishing");
  await expect(dialog).toContainText("Fix these to publish. You can still save a draft.");
  await expect(dialog.locator(".a-check-label", { hasText: "Summary" })).toBeVisible();
  await expect(dialog.getByText("Pick a rating. Not Rated can’t be published.")).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Publish story" })).toBeDisabled();
  await expect(dialog.locator("li", { hasText: "Story title" })).toContainText("done");
  await expect(dialog.locator("li", { hasText: "Summary" })).toContainText("needs attention");

  await dialog.getByRole("button", { name: "Keep editing" }).click();
  await expect(dialog).toHaveCount(0);
  await fillBasics(page, { fandom: "(e2e publish fandom)", rating: "Explicit" });
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await expect(dialog.getByRole("heading")).toHaveText("Publish “(e2e publish check)”?");
  await expect(dialog).toContainText("Readers will see this story on the fic list as soon as you publish.");
  await expect(dialog).toContainText("This story is rated Explicit. Readers see a content notice before chapter 1.");
  await dialog.getByRole("button", { name: "Publish story" }).click();
  await expect(page.locator(".a-pub-state")).toHaveText(/published/i);
  const res = await page.goto("/fics/e2e-publish-check");
  expect(res!.status()).toBe(200);
});

test("Escape and Save as draft close the publish check without publishing", async ({ page }) => {
  await write(page, "(e2e publish draft)", "(e2e draft body)");
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByRole("heading")).toHaveText("Publish “(e2e publish draft)”?");
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await dialog.getByRole("button", { name: "Save as draft" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.locator(".a-pub-state")).toHaveText(/draft/i);
  const res = await page.goto("/fics/e2e-publish-draft");
  expect(res!.status()).toBe(404);
});

test("scheduling a story with missing basics says what to add", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Add new story" }).click();
  await page.waitForURL(/\/admin\/stories\/\d+$/);
  await page.getByLabel("Story title").fill("(e2e publish bare)");
  await page.getByRole("button", { name: "Schedule" }).click();
  const tomorrow = new Date(Date.now() + 26 * 3_600_000).toLocaleString("sv-SE", { timeZone: "Asia/Manila" }).slice(0, 16).replace(" ", "T");
  await page.getByLabel("Publish on").fill(tomorrow);
  await page.getByRole("button", { name: "Confirm schedule" }).click();
  await expect(page.locator(".a-alert")).toContainText("Before publishing: add a summary, pick a rating and add a fandom.");
  await expect(page.locator(".a-pub-state")).toHaveText(/draft/i);
});
