import { expect, test, type Page } from "@playwright/test";

test("fic page shows details, tags and a chapter list", async ({ page }) => {
  await page.goto("/fics/sample-fic");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("(sample fic)");
  const details = page.locator(".story-details");
  await expect(details).toContainText("Teen and Up");
  await expect(details).toContainText("In progress");
  await expect(details).toContainText("675 words");
  await expect(page.getByRole("list", { name: "Tags" }).locator("li")).toHaveCount(4);
  await expect(page.getByRole("link", { name: "(sample fandom)" })).toHaveAttribute("href", "/tags/fandom/sample-fandom");
  const items = page.locator(".story-chapters li");
  await expect(items).toHaveCount(3);
  await expect(items.nth(0)).toContainText("1. (chapter title)");
  await expect(items.nth(1)).toContainText("Chapter 2");
});

test("chapter page: label, progress, word count, notes, buttons", async ({ page }) => {
  await page.goto("/fics/sample-fic/2");
  await expect(page.locator(".chapter-label")).toHaveText("Chapter 2 of 3 · 660 words");
  expect(await page.locator(".progress > div").evaluate((el) => (el as HTMLElement).style.width)).toBe("67%");
  await expect(page.getByText("(notes before)")).toBeVisible();
  const nav = page.locator(".chapter-buttons").first();
  await expect(nav.getByRole("link", { name: "Previous" })).toHaveAttribute("href", "/fics/sample-fic/1");
  await expect(nav.getByRole("link", { name: "Next" })).toHaveAttribute("href", "/fics/sample-fic/3");
  await nav.getByRole("link", { name: "Contents" }).click();
  await expect(page.getByLabel("Jump to chapter")).toBeFocused();
  await page.getByLabel("Jump to chapter").selectOption("3");
  await expect(page).toHaveURL(/\/fics\/sample-fic\/3$/);
  await expect(page.locator(".chapter-buttons").first().getByRole("link", { name: "Next" })).toHaveCount(0);
});

test("reading text follows the size and spacing choices", async ({ page }) => {
  await page.goto("/fics/sample-fic/1");
  const text = page.locator(".chapter-text");
  expect(await text.evaluate((el) => getComputedStyle(el).fontSize)).toBe("18.6667px"); // 14pt
  await page.getByRole("button", { name: "Display options" }).click();
  await page.getByLabel("Text size").fill("16");
  expect(await text.evaluate((el) => getComputedStyle(el).fontSize)).toBe("21.3333px"); // 16pt
  await page.locator('[aria-label="Line spacing"] button', { hasText: "Loose" }).click();
  expect(await text.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight) / parseFloat(getComputedStyle(el).fontSize))).toBeCloseTo(2.1, 1);
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

for (const theme of ["day", "lagoon", "night", "midnight"]) {
  test(`colored text stays readable in ${theme}`, async ({ page }) => {
    await page.goto("/fics/sample-fic/1");
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    expect(await contrastOfColoredText(page)).toBeGreaterThanOrEqual(4.5);
  });
}
