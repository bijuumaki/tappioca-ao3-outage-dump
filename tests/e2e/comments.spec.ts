import { expect, test, type Page } from "@playwright/test";
import { secretClient } from "../support/supabase-admin";

test.describe.configure({ mode: "serial" });

const clean = async () => { await secretClient().from("comments").delete().like("name", "(e2e%"); };
test.beforeAll(clean);
test.afterAll(clean);

/* The form marks itself ready once the page is interactive, so the first click never lands too early. */
async function ready(page: Page) {
  await page.goto("/fics/sample-fic/1");
  await expect(page.locator("form[aria-label='Leave a comment'][data-ready]")).toBeVisible();
}

test("a chapter with no comments says so and shows the form", async ({ page }) => {
  await ready(page);
  await expect(page.getByRole("heading", { name: "Comments on chapter 1 (0)" })).toBeVisible();
  await expect(page.getByText("No comments on this chapter yet.")).toBeVisible();
  await expect(page.getByLabel("Your name")).toBeVisible();
  await expect(page.getByLabel("Your comment")).toBeVisible();
});

test("an empty or half-filled form says what is missing", async ({ page }) => {
  await ready(page);
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Add your name and a comment to post." })).toBeVisible();
  await page.getByLabel("Your name").fill("(e2e sam)");
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Write a comment to post." })).toBeVisible();
});

test("a posted comment shows in the list, the count goes up and the name stays", async ({ page }) => {
  await ready(page);
  await page.getByLabel("Your name").fill("(e2e sam)");
  await page.getByLabel("Your comment").fill("(e2e first comment)");
  await page.getByRole("button", { name: "Post comment" }).click();
  await expect(page.getByRole("heading", { name: "Comments on chapter 1 (1)" })).toBeVisible();
  const item = page.locator(".comment", { hasText: "(e2e first comment)" });
  await expect(item).toContainText("(e2e sam)");
  await expect(page.getByLabel("Your comment")).toHaveValue("");
  await expect(page.getByLabel("Your name")).toHaveValue("(e2e sam)");
  await page.reload();
  await expect(page.locator(".comment", { hasText: "(e2e first comment)" })).toBeVisible();
});

test("HTML typed into a comment is shown as plain text", async ({ page }) => {
  await ready(page);
  await page.getByLabel("Your name").fill("(e2e html)");
  await page.getByLabel("Your comment").fill("<b>bold?</b> <script>window.__x = 1</script>");
  await page.getByRole("button", { name: "Post comment" }).click();
  const item = page.locator(".comment", { hasText: "(e2e html)" });
  await expect(item).toContainText("<b>bold?</b>");
  await expect(item.locator("b")).toHaveCount(0);
  expect(await page.evaluate(() => (window as unknown as { __x?: number }).__x)).toBeUndefined();
});

test("Leave a comment at the end of the story jumps to the comments", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await page.goto("/fics/sample-fic/3");
  await page.getByRole("link", { name: "Leave a comment" }).click();
  await expect(page.locator("#comments-heading")).toBeInViewport();
});

test("a Mature chapter shows no comments or form until the notice is accepted", async ({ page }) => {
  await page.goto("/fics/sample-mature/1");
  await expect(page.getByRole("heading", { name: "Content notice" })).toBeVisible();
  await expect(page.getByLabel("Your comment")).toHaveCount(0);
});
