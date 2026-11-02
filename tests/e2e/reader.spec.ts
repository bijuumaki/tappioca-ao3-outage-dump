import { expect, test, type Page } from "@playwright/test";

test("fic page shows details, tags and a contents list with word counts", async ({ page }) => {
  await page.goto("/fics/sample-fic");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("(sample fic)");
  const details = page.locator(".fic-details");
  await expect(details).toContainText("Teen");
  await expect(details).toContainText("In progress");
  await expect(details).toContainText("Fic");
  await expect(details).toContainText("675 words");
  await expect(page.locator(".tag-group")).toHaveCount(5);
  await expect(page.getByRole("link", { name: "(sample fandom)" })).toHaveAttribute("href", "/tags/fandom/sample-fandom");
  const items = page.locator('nav[aria-label="Contents"] li');
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText("10 words");
  await expect(items.nth(1)).toContainText("660 words");
  await expect(items.nth(2)).toContainText("5 words");
});

test("chapter page has notes, word count and previous / contents / next", async ({ page }) => {
  await page.goto("/fics/sample-fic/2");
  await expect(page.locator(".chapter-words")).toHaveText("660 words");
  await expect(page.getByText("(notes before)")).toBeVisible();
  const nav = page.locator('nav[aria-label="Chapters"]').first();
  await expect(nav.getByRole("link", { name: /Previous/ })).toHaveAttribute("href", "/fics/sample-fic/1");
  await expect(nav.getByRole("link", { name: /Contents/ })).toHaveAttribute("href", "/fics/sample-fic");
  await expect(nav.getByRole("link", { name: /Next/ })).toHaveAttribute("href", "/fics/sample-fic/3");
  await page.goto("/fics/sample-fic/3");
  await expect(page.locator('nav[aria-label="Chapters"]').first().getByRole("link", { name: /Next/ })).toHaveCount(0);
});

test("oneshot shows the story on the fic page and /1 redirects there", async ({ page }) => {
  await page.goto("/fics/sample-oneshot");
  await expect(page.getByText("Duis aute irure dolor in reprehenderit.")).toBeVisible();
  await expect(page.locator('nav[aria-label="Contents"]')).toHaveCount(0);
  await page.goto("/fics/sample-oneshot/1");
  await expect(page).toHaveURL(/\/fics\/sample-oneshot$/);
});

for (const path of ["/fics/sample-fic/0", "/fics/sample-fic/abc", "/fics/sample-fic/9", "/fics/sample-draft"]) {
  test(`${path} is not found`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res!.status()).toBe(404);
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });
}

test("a published fic with no chapters yet says so", async ({ page }) => {
  await page.goto("/fics/sample-empty");
  await expect(page.getByText("No chapters yet")).toBeVisible();
});

test("reading progress comes back after a reload", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 700 });
  await page.goto("/fics/sample-fic/2");
  const half = await page.evaluate(() => document.body.scrollHeight / 2);
  await page.mouse.wheel(0, half);
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.getByText(/Welcome back/)).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(200);
});

async function contrastOfColoredText(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector(".rich-text .rt-c") as HTMLElement;
    const parse = (s: string) => s.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
    const lum = ([r, g, b]: number[]) => {
      const ch = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
      return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
    };
    const fg = lum(parse(getComputedStyle(el).color));
    const bg = lum(parse(getComputedStyle(document.body).backgroundColor));
    return (Math.max(fg, bg) + 0.05) / (Math.min(fg, bg) + 0.05);
  });
}

test("colored text stays readable in light and dark", async ({ page }) => {
  await page.goto("/fics/sample-fic/1");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  expect(await contrastOfColoredText(page)).toBeGreaterThanOrEqual(4.5);
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "dark"));
  expect(await contrastOfColoredText(page)).toBeGreaterThanOrEqual(4.5);
});
