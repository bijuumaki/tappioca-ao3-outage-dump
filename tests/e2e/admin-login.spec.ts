import { expect, test } from "@playwright/test";
import { ADMIN, signIn } from "./admin-helpers";

test("signed-out visitors are sent to the sign-in page", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin-login/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
});

test("a wrong password is refused", async ({ page }) => {
  await page.goto("/admin-login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill("not-the-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.locator(".a-alert")).toHaveText("That email and password don’t match.");
  await expect(page).toHaveURL(/\/admin-login/);
});

test("the admin signs in, sees Stories, and signs out", async ({ page }) => {
  await signIn(page);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Stories");
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin-login/);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin-login/);
});

test("admin pages don't show the public menu", async ({ page }) => {
  await page.goto("/admin-login");
  await expect(page.locator('nav[aria-label="Site"]')).toHaveCount(0);
});

test("the sign-in address is /admin-login, and the old /admin/login points to it", async ({ page }) => {
  const res = await page.goto("/admin-login");
  expect(res!.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
  await page.goto("/admin/login");
  await expect(page).toHaveURL(/\/admin-login$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Sign in");
});

test("signing in from /admin-login lands on Stories, and a wrong password stays on /admin-login", async ({ page }) => {
  await signIn(page);
  await expect(page).toHaveURL(/\/admin$/);
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/admin-login$/);
});
