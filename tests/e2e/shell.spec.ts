import { expect, test } from "@playwright/test";

test("theme toggle switches and remembers", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await page.click("#theme-toggle");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("text size slider sets --fs", async ({ page }) => {
  await page.goto("/");
  await page.click("#aa-toggle");
  await page.locator("#size-slider").fill("20");
  const fs = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--fs").trim());
  expect(await fs()).toBe("20pt");
  await page.reload();
  expect(await fs()).toBe("20pt");
});

test("font menu loads the font only when picked", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[href*="Crimson+Pro"]')).toHaveCount(0);
  await page.click("#aa-toggle");
  await page.selectOption("#font-select", "crimson");
  await expect(page.locator('link[href*="Crimson+Pro"]')).toHaveCount(1);
  await expect(page.locator("html")).toHaveAttribute("data-font", "crimson");
});

test("Aa panel closes with Escape and returns focus", async ({ page }) => {
  await page.goto("/");
  await page.click("#aa-toggle");
  await expect(page.locator("#size-panel")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#size-panel")).toBeHidden();
  await expect(page.locator("#aa-toggle")).toBeFocused();
});
