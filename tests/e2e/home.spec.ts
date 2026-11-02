import { expect, test } from "@playwright/test";

test("home has the title, the archive box with counts, howdy and page buttons", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tappioca’s Fic Archive");
  const archive = page.locator('[aria-label="About this archive"]');
  await expect(archive).toContainText("3 stories");
  await expect(archive.locator("li", { hasText: "(sample fandom)" })).toContainText("2");
  await expect(page.getByRole("heading", { name: "Howdy" })).toBeVisible();
  await expect(page.locator("nav[aria-label=\"Pages\"] .home-row")).toHaveText(["Disclaimer", "About", "Fic List", "Links"]);
});

test("featured fic is the one marked featured", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".section-bar").first()).toHaveText("Featured: (sample fic)");
  await expect(page.locator(".featured")).toHaveAttribute("href", "/fics/sample-fic");
  await expect(page.locator(".featured-meta")).toContainText("Teen and Up");
  await expect(page.locator(".featured-meta")).toContainText("675 words");
});

test("recent art shows posts", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('[aria-label="Recent art"] .card')).toHaveCount(1);
  await expect(page.locator('[aria-label="Recent art"] .card')).toHaveAttribute("href", "/posts/sample-art");
});

test("fic list groups fics by fandom", async ({ page }) => {
  await page.goto("/fics");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fic List");
  const group = page.locator("section", { has: page.getByRole("heading", { name: "(sample fandom)" }) });
  await expect(group.locator(".card")).toHaveCount(2);
  await expect(page.locator("main")).not.toContainText("(sample draft)");
  await expect(page.locator("main")).toContainText("(sample empty)");
});
