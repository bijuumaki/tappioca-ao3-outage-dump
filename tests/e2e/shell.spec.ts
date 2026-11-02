import { expect, test } from "@playwright/test";

const bg = (page: import("@playwright/test").Page) => page.evaluate(() => getComputedStyle(document.body).backgroundColor);

test("site menu has the five pages, in order", async ({ page }) => {
  await page.goto("/");
  const links = page.locator('nav[aria-label="Site"] a');
  await expect(links).toHaveText(["Home", "Disclaimer", "About", "Fic List", "Links"]);
  await expect(links.nth(0)).toHaveAttribute("aria-current", "page");
});

test("starts in Day, and the theme choice is remembered", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
  expect(await bg(page)).toBe("rgb(237, 246, 249)");
  await page.getByRole("button", { name: "Display options" }).click();
  const themes = page.locator('[aria-label="Theme"] button');
  await expect(themes).toHaveText(["Day", "Lagoon", "Night", "Midnight"]);
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

test("text size steps by 2 between 10 and 20pt and is remembered", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Display options" }).click();
  const fs = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue("--fs").trim());
  expect(await fs()).toBe("14pt");
  for (let i = 0; i < 3; i++) await page.getByRole("button", { name: "Larger text" }).click();
  await expect(page.getByRole("button", { name: "Larger text" })).toBeDisabled();
  expect(await fs()).toBe("20pt");
  await page.reload();
  expect(await fs()).toBe("20pt");
});

test("font loads only when picked", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('link[href*="Crimson+Pro"]')).toHaveCount(0);
  await page.getByRole("button", { name: "Display options" }).click();
  await page.getByLabel("Font").selectOption("crimson");
  await expect(page.locator('link[href*="Crimson+Pro"]')).toHaveCount(1);
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

test("footer reads made with love by tappioca", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("footer")).toContainText("Made with");
  await expect(page.locator("footer")).toContainText("by Tappioca");
});

test("text is shown lowercase, story text is not", async ({ page }) => {
  await page.goto("/fics/sample-fic/1");
  expect(await page.evaluate(() => getComputedStyle(document.body).textTransform)).toBe("lowercase");
  expect(await page.evaluate(() => getComputedStyle(document.querySelector(".chapter-text")!).textTransform)).toBe("none");
});
