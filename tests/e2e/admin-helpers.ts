import { expect, type Page } from "@playwright/test";
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

/* The basics a story needs before it can be published. */
export async function fillBasics(page: Page, o: { fandom: string; rating?: string; summary?: string }) {
  await page.getByLabel("Fandom").fill(o.fandom);
  await page.getByLabel("Rating").selectOption({ label: o.rating ?? "Teen and Up" });
  await page.getByLabel("Summary").fill(o.summary ?? "(e2e summary)");
}

/* Publish, then confirm in the publish check dialog. */
export async function publishViaDialog(page: Page) {
  await page.getByRole("button", { name: "Publish", exact: true }).click();
  await page.getByRole("dialog").getByRole("button", { name: "Publish story" }).click();
}

/* "Save details", repeated until it really saved (the first click can land before the page is interactive). */
export async function saveDetails(page: Page) {
  await expect(async () => {
    await page.getByRole("button", { name: "Save details" }).click({ timeout: 2000 });
    await expect(page.locator(".a-saved")).toBeVisible({ timeout: 2500 });
  }).toPass({ timeout: 15_000 });
}
