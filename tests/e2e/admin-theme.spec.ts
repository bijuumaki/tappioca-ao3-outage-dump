import { expect, test } from "@playwright/test";
import { signIn } from "./admin-helpers";

const bg = (page: import("@playwright/test").Page) => page.evaluate(() => getComputedStyle(document.querySelector(".admin")!).backgroundColor);

test("admin starts in day and the theme choice is remembered", async ({ page }) => {
  await signIn(page);
  await expect(page.locator(".admin")).toHaveAttribute("data-admin-theme", "day");
  expect(await bg(page)).toBe("rgb(237, 246, 249)");
  await page.getByRole("button", { name: "Display options" }).click();
  const themes = page.locator('[aria-label="Theme"] button');
  await expect(themes).toHaveText(["Day", "Lagoon", "Night", "Midnight"]);
  await themes.nth(1).click();
  await expect(page.locator(".admin")).toHaveAttribute("data-admin-theme", "lagoon");
  expect(await bg(page)).toBe("rgb(246, 241, 231)");
  await page.reload();
  await expect(page.locator(".admin")).toHaveAttribute("data-admin-theme", "lagoon");
});

test("admin text is lowercase and readable in every theme", async ({ page }) => {
  await signIn(page);
  expect(await page.evaluate(() => getComputedStyle(document.querySelector(".admin")!).textTransform)).toBe("lowercase");
  for (const theme of ["day", "lagoon", "night", "midnight"]) {
    await page.evaluate((t) => document.querySelector(".admin")!.setAttribute("data-admin-theme", t), theme);
    const ratio = await page.evaluate(() => {
      const parse = (s: string) => s.match(/\d+(\.\d+)?/g)!.slice(0, 3).map(Number);
      const lum = ([r, g, b]: number[]) => {
        const ch = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
        return 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b);
      };
      const el = document.querySelector(".admin")!;
      const fg = lum(parse(getComputedStyle(el).color)), bgc = lum(parse(getComputedStyle(el).backgroundColor));
      return (Math.max(fg, bgc) + 0.05) / (Math.min(fg, bgc) + 0.05);
    });
    expect(ratio, theme).toBeGreaterThanOrEqual(4.5);
  }
});

test("the sign-in page uses the admin theme too", async ({ page }) => {
  await page.goto("/admin/login");
  await expect(page.locator(".admin")).toHaveAttribute("data-admin-theme", "day");
});
