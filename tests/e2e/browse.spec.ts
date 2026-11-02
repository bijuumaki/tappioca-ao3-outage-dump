import { expect, test } from "@playwright/test";

test("art post shows images with captions, embed link and tags", async ({ page }) => {
  await page.goto("/posts/sample-art");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("(sample art)");
  await expect(page.locator("figure img")).toHaveCount(2);
  await expect(page.getByText("(caption one)")).toBeVisible();
  await expect(page.getByText("(caption two)")).toBeVisible();
  await expect(page.locator('a[href="https://example.com/(sample embed)"]')).toBeVisible();
  await expect(page.getByRole("link", { name: "(sample tag)" })).toHaveAttribute("href", "/tags/freeform/sample-tag");
});

test("clicking a fandom tag opens its tag page", async ({ page }) => {
  await page.goto("/fics/sample-fic");
  await page.getByRole("link", { name: "(sample fandom)" }).click();
  await expect(page).toHaveURL(/\/tags\/fandom\/sample-fandom$/);
  await expect(page.locator(".fic-card")).toHaveCount(2);
  await expect(page.locator(".post-card")).toHaveCount(1);
});

test("browse filters by category", async ({ page }) => {
  await page.goto("/browse?category=art");
  await expect(page.locator(".fic-card")).toHaveCount(0);
  await expect(page.locator(".post-card")).toHaveCount(1);
});

test("browse filters by rating", async ({ page }) => {
  await page.goto("/browse?rating=teen");
  await expect(page.locator(".fic-card")).toHaveCount(1);
  await expect(page.locator(".fic-card")).toContainText("(sample fic)");
  await expect(page.locator(".post-card")).toHaveCount(0);
});

test("browse sorts by longest", async ({ page }) => {
  await page.goto("/browse?sort=longest");
  const words = await page.locator(".fic-card .card-words").evaluateAll((els) => els.map((e) => Number(e.getAttribute("data-words"))));
  expect(words.length).toBeGreaterThan(1);
  expect(words).toEqual([...words].sort((a, b) => b - a));
});

test("browse form works without JavaScript", async ({ browser }) => {
  const ctx = await browser.newContext({ javaScriptEnabled: false });
  const page = await ctx.newPage();
  await page.goto("/browse");
  await page.selectOption('select[name="category"]', "art");
  await page.getByRole("button", { name: "Show" }).click();
  await expect(page).toHaveURL(/category=art/);
  await expect(page.locator(".post-card")).toHaveCount(1);
  await ctx.close();
});

test("simple pages exist and others are not found", async ({ page }) => {
  await page.goto("/about");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("About");
  const res = await page.goto("/nonsense-page");
  expect(res!.status()).toBe(404);
});

for (const path of ["/", "/fics", "/fics/sample-fic", "/fics/sample-fic/2", "/posts/sample-art", "/browse", "/about", "/links"]) {
  test(`no sideways scroll at 390px on ${path}`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(path);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
}
