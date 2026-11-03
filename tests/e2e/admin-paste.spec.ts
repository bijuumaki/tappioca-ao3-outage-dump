import { expect, test } from "@playwright/test";
import { secretClient } from "../support/supabase-admin";
import { signIn, saveDetails } from "./admin-helpers";

test.describe.configure({ mode: "serial" });
async function cleanUp() {
  const db = secretClient();
  const { data } = await db.from("fics").select("id").like("title", "(e2e paste%");
  for (const f of data ?? []) await db.from("fics").delete().eq("id", f.id);
}
test.beforeAll(cleanUp);
test.afterAll(cleanUp);

async function newStory(page: import("@playwright/test").Page, title: string) {
  await signIn(page);
  await page.getByRole("link", { name: "Add new story" }).click();
  await page.waitForURL(/\/admin\/stories\/\d+$/);
  await page.getByLabel("Story title").fill(title);
  await saveDetails(page);
}

const SAMPLE = '<p style="color:#8b3253">hello <em>there</em></p><script>alert(1)</script><p style="font-family:Arial">more</p>';

test("pasted HTML shows a clean preview and fills the chapter", async ({ page }) => {
  await newStory(page, "(e2e paste use)");
  await page.getByText("Paste HTML", { exact: true }).click();
  await page.getByLabel("HTML to paste").fill(SAMPLE);
  const preview = page.locator(".a-paste-preview");
  await expect(preview).toContainText("hello there");
  await expect(preview).not.toContainText("alert");
  await page.getByRole("button", { name: "Use this" }).click();
  await expect(page.locator(".a-editor .ProseMirror")).toContainText("hello there");
  await expect(page.locator(".a-save-state")).toHaveText(/saved/i, { timeout: 10_000 });
  const id = Number(page.url().match(/stories\/(\d+)/)![1]);
  const { data } = await secretClient().from("chapters").select("body, word_count").eq("fic_id", id).single();
  expect(data!.body).not.toContain("script");
  expect(data!.body).not.toContain("font-family");
  expect(data!.body).toContain("<em>there</em>");
  expect(data!.word_count).toBe(3);
});

test("Add to the end keeps what was already written", async ({ page }) => {
  await newStory(page, "(e2e paste add)");
  await page.locator(".a-editor .ProseMirror").click();
  await page.keyboard.type("first");
  await page.getByText("Paste HTML", { exact: true }).click();
  await page.getByLabel("HTML to paste").fill("<p>second</p>");
  await page.getByRole("button", { name: "Add to the end" }).click();
  await expect(page.locator(".a-editor .ProseMirror")).toContainText("first");
  await expect(page.locator(".a-editor .ProseMirror")).toContainText("second");
});

test("a picture embedded in pasted HTML is stored as a file, not kept inside the text", async ({ page }) => {
  await newStory(page, "(e2e paste image)");
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGNgGAWjgAEAAAEAAbhoEZYAAAAASUVORK5CYII=";
  await page.getByText("Paste HTML", { exact: true }).click();
  await page.getByLabel("HTML to paste").fill(`<p>pic</p><img src="data:image/png;base64,${png}" alt="x">`);
  await expect(page.locator(".a-paste-preview img")).toHaveAttribute("src", /^https:\/\/.+\/storage\/v1\/object\/public\/media\/fics\/\d+\/images\//);
  await page.getByRole("button", { name: "Use this" }).click();
  await expect(page.locator(".a-editor .ProseMirror img")).toBeVisible();
  await expect(page.locator(".a-save-state")).toHaveText(/saved/i, { timeout: 10_000 });
  const id = Number(page.url().match(/stories\/(\d+)/)![1]);
  const { data } = await secretClient().from("chapters").select("body").eq("fic_id", id).single();
  expect(data!.body).not.toContain("data:");
  expect(data!.body).toContain("/storage/v1/object/public/media/fics/");
});
