import { expect, test } from "@playwright/test";

const bg = (page: import("@playwright/test").Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test("starts in Day, and the theme choice is remembered", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
  expect(await bg(page)).toBe("rgb(237, 246, 249)");
  await page.getByRole("button", { name: "Display options" }).click();
  const themes = page.locator('[aria-label="Theme"] button');
  await expect(themes).toHaveText(["Day", "Old paper", "Night", "Midnight"]);
  await themes.nth(1).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "lagoon");
  expect(await bg(page)).toBe("rgb(246, 241, 231)");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "lagoon");
});

test("a dark-mode device starts in Night", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "night");
});

test("text size steps by 2 between 10 and 20pt, scales the whole site, and is remembered", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Display options" }).click();
  const read = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--read").trim());
  const titleSize = () => page.evaluate(() => parseFloat(getComputedStyle(document.querySelector("h1")!).fontSize));
  expect(await read()).toBe("14pt");
  const before = await titleSize();
  const slider = page.getByLabel("Text size");
  await expect(slider).toHaveAttribute("min", "10");
  await expect(slider).toHaveAttribute("max", "20");
  await expect(slider).toHaveAttribute("step", "2");
  await slider.fill("20");
  expect(await read()).toBe("20pt");
  expect(await titleSize()).toBeGreaterThan(before * 1.3);
  await page.reload();
  expect(await read()).toBe("20pt");
});

test("the font cards load their fonts when the panel opens, and picking one applies it", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[href*="Crimson+Pro"]')).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveAttribute("data-font", /.+/);
  await page.getByRole("button", { name: "Display options" }).click();
  await expect(page.locator('link[href*="Crimson+Pro"]')).toHaveCount(1);
  await expect(page.locator("html")).not.toHaveAttribute("data-font", /.+/);
  await page.getByRole("button", { name: "Crimson Pro", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("data-font", "crimson");
});

test("line spacing has tight, normal and loose", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Display options" }).click();
  const group = page.locator('[aria-label="Line spacing"] button');
  await expect(group).toHaveText(["Tight", "Normal", "Loose"]);
  await group.nth(2).click();
  await expect(page.locator("html")).toHaveAttribute("data-spacing", "loose");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-spacing", "loose");
});

test("display options close with Escape and return focus", async ({ page }) => {
  await page.goto("/");
  const aa = page.getByRole("button", { name: "Display options" });
  await aa.click();
  await expect(page.locator("#display-options")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#display-options")).toBeHidden();
  await expect(aa).toBeFocused();
});

test("footer credits tappioca and the rightful owners", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("footer")).toHaveText("online web app made by tappioca. all intellectual properties belong to their rightful owners.");
});

test("text is shown lowercase, story text is not", async ({ page }) => {
  await page.goto("/fics/sample-fic/1");
  expect(await page.evaluate(() => getComputedStyle(document.body).textTransform)).toBe("lowercase");
  expect(await page.evaluate(() => getComputedStyle(document.querySelector(".chapter-text")!).textTransform)).toBe("none");
});
