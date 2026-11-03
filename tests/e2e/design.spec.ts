import { expect, test } from "@playwright/test";

test("there is no top menu; the page buttons live on the home page", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('nav[aria-label="Site"]')).toHaveCount(0);
  await expect(page.locator('nav[aria-label="Pages"] a')).toHaveCount(4);
  await expect(page.locator('nav[aria-label="Pages"] svg')).toHaveCount(0);
  await expect(page.locator("h1 a")).toHaveAttribute("href", "/");
});

test("other pages have the site title as a link home", async ({ page }) => {
  for (const path of ["/fics", "/about", "/fics/sample-fic", "/fics/sample-fic/1"]) {
    await page.goto(path);
    const link = page.locator(".site-title");
    await expect(link, path).toHaveText("Tappioca’s Fic Archive");
    await expect(link, path).toHaveAttribute("href", "/");
  }
  await page.goto("/");
  await expect(page.locator(".site-title")).toBeHidden();
});

test("home has no Recent Fics section", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator(".section-bar", { hasText: "Recent Fics" })).toHaveCount(0);
});

test("the photo circle is 205px", async ({ page }) => {
  await page.goto("/");
  const box = await page.locator(".home-side .photo").boundingBox();
  expect(Math.round(box!.width)).toBe(205);
  expect(Math.round(box!.height)).toBe(205);
});

test("clickable cards and buttons use the stronger field border in each theme", async ({ page }) => {
  await page.goto("/");
  const expected: Record<string, string> = { day: "rgb(63, 133, 144)", lagoon: "rgb(60, 85, 88)", night: "rgb(106, 154, 163)", midnight: "rgb(116, 133, 143)" };
  for (const [theme, color] of Object.entries(expected)) {
    await page.evaluate((t) => document.documentElement.setAttribute("data-theme", t), theme);
    expect(await page.locator(".featured").evaluate((el) => getComputedStyle(el).borderTopColor), theme).toBe(color);
  }
});

test("Lagoon's Howdy rose is the deeper one", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "lagoon"));
  expect(await page.locator(".howdy h2").evaluate((el) => getComputedStyle(el).color)).toBe("rgb(168, 75, 78)");
});

test("display options: a dialog with a Close button", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Display options" }).click();
  const dialog = page.getByRole("dialog", { name: "Display options" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Close" }).click();
  await expect(dialog).toBeHidden();
});

test("on a phone the display options are a sheet along the bottom", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/");
  await page.getByRole("button", { name: "Display options" }).click();
  const box = await page.getByRole("dialog", { name: "Display options" }).boundingBox();
  expect(Math.round(box!.x)).toBe(0);
  expect(Math.round(box!.width)).toBe(390);
  expect(Math.round(box!.y + box!.height)).toBe(800);
});

test("on a wide screen the panel pushes the chapter over instead of covering it", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/fics/sample-fic/1");
  const pad = () => page.locator(".site").evaluate((el) => getComputedStyle(el).paddingRight);
  const before = parseFloat(await pad());
  await page.getByRole("button", { name: "Display options" }).click();
  await expect.poll(async () => parseFloat(await pad())).toBe(344);
  expect(before).toBeLessThan(344);
  await page.keyboard.press("Escape");
  await expect.poll(async () => parseFloat(await pad())).toBe(before);
});

test("the font choice changes the whole site's text but not the site title", async ({ page }) => {
  await page.goto("/fics");
  await page.getByRole("button", { name: "Display options" }).click();
  await page.getByLabel("Font").selectOption("crimson");
  expect(await page.locator("main").evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Crimson Pro");
  expect(await page.locator(".page-title").evaluate((el) => getComputedStyle(el).fontFamily)).toContain("Crimson Pro");
  expect(await page.locator(".site-title").evaluate((el) => getComputedStyle(el).fontFamily)).toContain("IM Fell English");
});

test("there are no previous and next buttons under the title (canvas v129)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/fics/sample-fic/2");
  await expect(page.getByRole("group", { name: "Chapter navigation" })).toHaveCount(0);
  await expect(page.getByRole("navigation", { name: "Chapters" }).getByRole("link", { name: "Previous chapter" })).toHaveAttribute("href", "/fics/sample-fic/1");
});

test("the chapter bar reads Chapter N: title, centered", async ({ page }) => {
  await page.goto("/fics/sample-fic/2");
  const bar = page.locator(".chapter-title");
  await expect(bar).toHaveText(/^Chapter 2: /);
  expect(await bar.evaluate((el) => getComputedStyle(el).textAlign)).toBe("center");
});

test("the Links page is writing with links in it, not big buttons", async ({ page }) => {
  await page.goto("/links");
  await expect(page.locator(".links-page .home-row")).toHaveCount(0);
});

test("long titles and text stay inside the screen at the largest size on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.addInitScript(() => localStorage.setItem("fic-site-size", "20"));
  for (const path of ["/", "/fics", "/fics/sample-fic", "/fics/sample-fic/1"]) {
    await page.goto(path);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(over, path).toBeLessThanOrEqual(0);
  }
});
