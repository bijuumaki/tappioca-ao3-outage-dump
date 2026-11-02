import { expect, test, type Page } from "@playwright/test";
import { secretClient } from "../support/supabase-admin";
import { signIn } from "./admin-helpers";

test.describe.configure({ mode: "serial" });

async function cleanUp() {
  const db = secretClient();
  const { data } = await db.from("fics").select("id").like("title", "(e2e editor%");
  for (const f of data ?? []) await db.from("fics").delete().eq("id", f.id);
}
test.beforeAll(cleanUp);
test.afterAll(cleanUp);

async function newStory(page: Page, title: string) {
  await signIn(page);
  await page.getByRole("link", { name: "New Story" }).click();
  await page.waitForURL(/\/admin\/stories\/\d+$/);
  await page.getByLabel("Story title").fill(title);
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.locator(".a-saved")).toBeVisible();
}

const editor = (page: Page) => page.locator(".a-editor .ProseMirror");
const saved = (page: Page) => expect(page.locator(".a-save-state")).toHaveText(/saved/i, { timeout: 10_000 });

test("bold text, alignment and color are saved and come back", async ({ page }) => {
  await newStory(page, "(e2e editor format)");
  await editor(page).click();
  await page.keyboard.type("hello");
  await page.keyboard.press("ControlOrMeta+a");
  await page.getByRole("button", { name: "Bold" }).click();
  await page.getByRole("button", { name: "Align center" }).click();
  await page.getByLabel("Text color").fill("#8b3253");
  await saved(page);
  await page.reload();
  await expect(editor(page).locator("strong")).toHaveText("hello");
  await expect(editor(page).locator("p")).toHaveAttribute("style", /text-align: center/);
  await expect(editor(page).locator('span[style*="color"]')).toHaveCount(1);
  await expect(page.locator(".a-wordcount")).toHaveText("1 word");
});

test("pasted HTML is cleaned before saving", async ({ page }) => {
  await newStory(page, "(e2e editor paste)");
  await editor(page).click();
  await editor(page).evaluate((el) => {
    const data = new DataTransfer();
    data.setData("text/html", '<p>pasted <em>words</em></p><script>alert(1)</script><p style="font-family:Arial">more</p>');
    data.setData("text/plain", "pasted words more");
    el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }));
  });
  await saved(page);
  const id = Number(page.url().match(/stories\/(\d+)/)![1]);
  const { data } = await secretClient().from("chapters").select("body, word_count").eq("fic_id", id).single();
  expect(data!.body).toContain("<em>words</em>");
  expect(data!.body).not.toContain("script");
  expect(data!.body).not.toContain("font-family");
  expect(data!.word_count).toBe(3);
});

test("scene break, and font/size only change the writing view", async ({ page }) => {
  await newStory(page, "(e2e editor view)");
  await editor(page).click();
  await page.keyboard.type("one");
  await page.getByRole("button", { name: "Scene break" }).click();
  await page.getByLabel("Font").selectOption({ label: "Crimson Pro" });
  await page.getByRole("button", { name: "Larger text" }).click();
  await saved(page);
  const id = Number(page.url().match(/stories\/(\d+)/)![1]);
  const { data } = await secretClient().from("chapters").select("body").eq("fic_id", id).single();
  expect(data!.body).toContain("<hr");
  expect(data!.body).not.toContain("Crimson");
  expect(await editor(page).evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Crimson Pro");
});

test("if the sign-in runs out, autosave says so and keeps the text", async ({ page, context }) => {
  await newStory(page, "(e2e editor signed out)");
  await editor(page).click();
  await page.keyboard.type("first");
  await saved(page);
  await context.clearCookies();
  await page.keyboard.type(" second");
  await expect(page.locator(".a-save-state")).toHaveText(/not saved: sign in again/i, { timeout: 10_000 });
  await expect(editor(page)).toContainText("first second");
});
