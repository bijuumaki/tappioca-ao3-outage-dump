import type { Page } from "@playwright/test";
import nextEnv from "@next/env";
const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());
export const ADMIN = { email: "e2e-admin@tappioca.test", password: process.env.E2E_ADMIN_PASSWORD ?? "" };

export async function signIn(page: Page) {
  await page.goto("/admin-login");
  await page.getByLabel("Email").fill(ADMIN.email);
  await page.getByLabel("Password").fill(ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
}
