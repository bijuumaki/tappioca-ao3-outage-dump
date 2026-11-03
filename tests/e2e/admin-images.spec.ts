import { expect, test, type Page } from "@playwright/test";
import { secretClient } from "../support/supabase-admin";
import { fillBasics, publishViaDialog, signIn } from "./admin-helpers";

test.describe.configure({ mode: "serial" });
async function cleanUp() {
  const db = secretClient();
  const { data } = await db.from("fics").select("id").like("title", "(e2e image%");
  for (const f of data ?? []) {
    const { data: files } = await db.storage.from("media").list(`fics/${f.id}/images`);
    if (files?.length) await db.storage.from("media").remove(files.map((x) => `fics/${f.id}/images/${x.name}`));
    await db.from("fics").delete().eq("id", f.id);
  }
  await db.from("tags").delete().like("name", "(e2e image%");
}
test.beforeAll(cleanUp);
test.afterAll(cleanUp);

async function newStory(page: Page, title: string) {
  await signIn(page);
  await page.getByRole("link", { name: "Add new story" }).click();
  await page.waitForURL(/\/admin\/stories\/\d+$/);
  await page.getByLabel("Story title").fill(title);
  await fillBasics(page, { fandom: "(e2e image fandom)" });
  await page.getByRole("button", { name: "Save details" }).click();
  await expect(page.locator(".a-saved")).toBeVisible();
}

test("a picture is added to the chapter, saved, and shows on the public page", async ({ page }) => {
  await newStory(page, "(e2e image add)");
  await page.locator(".a-editor .ProseMirror").click();
  await page.keyboard.type("before");
  await page.locator('input[data-image-input]').setInputFiles("tests/e2e/fixtures/cover.png");
  const img = page.locator(".a-editor .ProseMirror img");
  await expect(img).toBeVisible({ timeout: 15_000 });
  await expect(img).toHaveAttribute("src", /^https:\/\/.+\/storage\/v1\/object\/public\/media\/fics\/\d+\/images\/.+\.(png|webp|jpg)$/);
  await expect(page.locator(".a-save-state")).toHaveText(/saved/i, { timeout: 10_000 });
  await publishViaDialog(page);
  await expect(page.locator(".a-pub-state")).toHaveText(/published/i);
  await page.goto("/fics/e2e-image-add/1");
  await expect(page.locator(".chapter-text img")).toHaveAttribute("src", /\/storage\/v1\/object\/public\/media\/fics\//);
});

test("a file that only pretends to be a picture is refused", async ({ page }) => {
  await newStory(page, "(e2e image fake)");
  await page.locator('input[data-image-input]').setInputFiles({ name: "photo.png", mimeType: "image/png", buffer: Buffer.from("<html><script>alert(1)</script></html>") });
  await expect(page.locator(".a-image-error")).toContainText("isn’t a JPG, PNG, WebP, GIF or AVIF");
  await expect(page.locator(".a-editor .ProseMirror img")).toHaveCount(0);
});

test("a cover that only pretends to be a picture is refused", async ({ page }) => {
  await newStory(page, "(e2e image cover)");
  await page.getByLabel("Upload image").setInputFiles({ name: "cover.png", mimeType: "image/png", buffer: Buffer.concat([Buffer.from("<html>"), Buffer.alloc(100)]) });
  await expect(page.locator('[aria-label="Cover image"] .a-alert')).toContainText("isn’t a JPG, PNG, WebP, GIF or AVIF");
  await expect(page.locator(".a-cover img")).toHaveCount(0);
});

test("an oversized picture is shrunk in the browser before it is sent", async ({ page }) => {
  await newStory(page, "(e2e image big)");
  // a real 3000x2000 PNG made in the page itself, so it needs shrinking
  const big = await page.evaluate(async () => {
    const c = document.createElement("canvas"); c.width = 3000; c.height = 2000;
    const g = c.getContext("2d")!; g.fillStyle = "#83c5be"; g.fillRect(0, 0, 3000, 2000);
    for (let i = 0; i < 90000; i++) { g.fillStyle = `hsl(${Math.random() * 360},${40 + Math.random() * 50}%,${30 + Math.random() * 40}%)`; g.fillRect(Math.random() * 3000, Math.random() * 2000, 10, 10); }
    const blob: Blob = await new Promise((r) => c.toBlob((b) => r(b!), "image/png"));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  expect(big.length).toBeGreaterThan(1_500_000);
  await page.locator('input[data-image-input]').setInputFiles({ name: "big.png", mimeType: "image/png", buffer: Buffer.from(big) });
  const img = page.locator(".a-editor .ProseMirror img");
  await expect(img).toBeVisible({ timeout: 30_000 });
  const width = await img.evaluate((el: HTMLImageElement) => el.naturalWidth);
  await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth), { timeout: 15_000 }).toBeLessThanOrEqual(2400);
  expect(width).toBeGreaterThan(0);
});
