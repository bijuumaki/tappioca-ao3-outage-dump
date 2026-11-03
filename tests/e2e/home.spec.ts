import { expect, test } from "@playwright/test";

test("home has the title, the archive box with counts, howdy and page buttons", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Tappioca’s Fic Archive");
  const archive = page.locator('[aria-label="About this archive"]');
  await expect(archive).toContainText("4 stories");
  await expect(archive.locator("li", { hasText: "(sample fandom)" })).toContainText("3");
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
  await expect(group.locator(".card")).toHaveCount(3);
  await expect(page.locator("main")).not.toContainText("(sample draft)");
  await expect(page.locator("main")).toContainText("(sample empty)");
});

test("continue reading offers to resume the last chapter you opened", async ({ page }) => {
  await page.goto("/fics/sample-fic/2");
  await page.goto("/");
  const resume = page.getByRole("region", { name: "Continue reading" });
  await expect(resume).toContainText("(sample fic)");
  await expect(resume).toContainText("Chapter 2 of 3");
  await expect(resume.getByRole("link", { name: "Resume" })).toHaveAttribute("href", "/fics/sample-fic/2");
});

test("a first-time visitor sees no continue reading box", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Howdy" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Continue reading" })).toHaveCount(0);
});

test("more stories lists the other published stories, not the featured one", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "More stories" })).toBeVisible();
  const cards = page.locator('[aria-label="More stories"] .card');
  await expect(cards.filter({ hasText: "(sample oneshot)" })).toHaveCount(1);
  await expect(cards.filter({ hasText: "(sample mature)" })).toHaveCount(1);
  await expect(cards.filter({ hasText: "(sample fic)" })).toHaveCount(0);
  await expect(cards.filter({ hasText: "(sample draft)" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "See the whole fic list" })).toHaveAttribute("href", "/fics");
});

test("the featured story comes before the intro, as in the design", async ({ page }) => {
  await page.goto("/");
  const featured = await page.getByRole("heading", { name: "Featured: (sample fic)" }).boundingBox();
  const howdy = await page.getByRole("heading", { name: "Howdy" }).boundingBox();
  expect(featured!.y).toBeLessThan(howdy!.y);
});
