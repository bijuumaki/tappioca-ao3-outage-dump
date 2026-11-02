import { expect, test } from "@playwright/test";
import { signIn } from "./admin-helpers";

test("lists every story, drafts included, with tabs and counts", async ({ page }) => {
  await signIn(page);
  const rows = page.locator(".a-story");
  await expect(rows.filter({ hasText: "(sample draft)" })).toHaveCount(1);
  await expect(rows.filter({ hasText: "(sample fic)" })).toHaveCount(1);
  const total = await rows.count();
  const tabs = page.locator('[aria-label="Filter by status"] a');
  await expect(tabs).toHaveCount(3);
  await expect(tabs.nth(0)).toContainText(/all/i);
  await expect(tabs.nth(0)).toContainText(String(total));
  await tabs.nth(2).click();
  await expect(page).toHaveURL(/status=drafts/);
  await expect(page.locator(".a-story").filter({ hasText: "(sample fic)" })).toHaveCount(0);
  await expect(page.locator(".a-story").filter({ hasText: "(sample draft)" })).toHaveCount(1);
});

test("a row shows rating, chapters, words and status; view only for published", async ({ page }) => {
  await signIn(page);
  const fic = page.locator(".a-story", { hasText: "(sample fic)" });
  await expect(fic).toContainText(/teen and up/i);
  await expect(fic).toContainText("678");
  await expect(fic).toContainText(/published/i);
  await expect(fic.getByRole("link", { name: "view" })).toHaveAttribute("href", "/fics/sample-fic");
  const draft = page.locator(".a-story", { hasText: "(sample draft)" });
  await expect(draft).toContainText(/draft/i);
  await expect(draft.getByRole("link", { name: "view" })).toHaveCount(0);
  await expect(draft.getByRole("link", { name: "edit" })).toHaveAttribute("href", /\/admin\/stories\/\d+$/);
});

test("the fandom filter narrows the list", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Fandom").selectOption({ label: "(sample fandom)" });
  await page.getByRole("button", { name: "show" }).click();
  await expect(page).toHaveURL(/fandom=sample-fandom/);
  await expect(page.locator(".a-story")).toHaveCount(2);
});

test("new story button and phone layout", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("link", { name: "New Story" })).toHaveAttribute("href", "/admin/stories/new");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect(page.locator(".a-story-head")).toBeHidden();
  const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(over).toBeLessThanOrEqual(0);
});
